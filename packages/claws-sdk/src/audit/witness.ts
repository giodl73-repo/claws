/**
 * Witness receipt storage and Merkle proof validation.
 *
 * Witness receipts provide cryptographic proof that a specific audit entry
 * existed in the chain at a given point in time. Each receipt contains a
 * Merkle proof (sibling hashes from leaf to root) that can be independently
 * verified without access to the full chain.
 *
 * Receipts are stored at `.claws/audit/receipts/{entryHash}.json` and
 * indexed by entry hash for O(1) lookup.
 *
 * @module claws-sdk/audit/witness
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ChainEntry, WitnessReceipt } from './types.js';

/** Receipts directory relative to workspace root. */
const RECEIPTS_DIR = '.claws/audit/receipts';

/** Validates that a string is a 64-character lowercase hex hash (SHA-256). */
const VALID_HASH_RE = /^[0-9a-f]{64}$/;

/**
 * Validate that entryHash is a valid 64-char hex string.
 * Prevents path traversal via crafted hash values.
 */
function validateEntryHash(entryHash: string): void {
  if (!VALID_HASH_RE.test(entryHash)) {
    throw new Error(
      `Invalid entry hash: expected 64-char lowercase hex string, got "${entryHash.length > 80 ? entryHash.slice(0, 80) + '...' : entryHash}"`,
    );
  }
}

/**
 * Compute SHA-256 hash of a string.
 */
function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Build a Merkle tree from an array of leaf hashes.
 *
 * Returns the tree as an array of levels, where level 0 is the leaves
 * (padded to the next power of 2) and the last level is the root.
 *
 * Empty leaves are represented by the SHA-256 hash of the empty string.
 */
function buildMerkleTree(leafHashes: readonly string[]): string[][] {
  if (leafHashes.length === 0) {
    return [[sha256('')]];
  }

  // Pad leaves to next power of 2
  const emptyLeaf = sha256('');
  let leaves = [...leafHashes];
  let size = 1;
  while (size < leaves.length) size *= 2;
  while (leaves.length < size) {
    leaves.push(emptyLeaf);
  }

  const tree: string[][] = [leaves];

  // Build tree bottom-up
  let currentLevel = leaves;
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1]!;
      nextLevel.push(sha256(left + right));
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return tree;
}

/**
 * Extract the Merkle proof (sibling hashes) for a leaf at a given index.
 */
function extractProof(
  tree: string[][],
  leafIndex: number,
): Array<{ hash: string; position: 'left' | 'right' }> {
  const proof: Array<{ hash: string; position: 'left' | 'right' }> = [];
  let idx = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const currentLevel = tree[level]!;
    const isLeftChild = idx % 2 === 0;
    const siblingIdx = isLeftChild ? idx + 1 : idx - 1;
    const siblingHash = currentLevel[siblingIdx]!;

    // The sibling's position relative to us:
    // If we're the left child, sibling is on the right
    // If we're the right child, sibling is on the left
    proof.push({
      hash: siblingHash,
      position: isLeftChild ? 'right' : 'left',
    });

    idx = Math.floor(idx / 2);
  }

  return proof;
}

/**
 * Verify a Merkle proof: recompute the root from the leaf hash and proof path.
 *
 * @param entryHash - The leaf hash to verify.
 * @param proof - Ordered sibling hashes from leaf to root.
 * @param expectedRoot - The expected Merkle root hash.
 * @returns true if the recomputed root matches the expected root.
 */
export function verifyMerkleProof(
  entryHash: string,
  proof: ReadonlyArray<{ readonly hash: string; readonly position: 'left' | 'right' }>,
  expectedRoot: string,
): boolean {
  let current = entryHash;
  for (const sibling of proof) {
    if (sibling.position === 'left') {
      current = sha256(sibling.hash + current);
    } else {
      current = sha256(current + sibling.hash);
    }
  }
  return timingSafeEqual(Buffer.from(current, 'hex'), Buffer.from(expectedRoot, 'hex'));
}

/**
 * Issue a witness receipt for a chain entry.
 *
 * Builds a Merkle tree from all chain entry hashes, extracts the proof
 * path for the target entry, and returns a WitnessReceipt.
 *
 * @param entries - All chain entries (ordered).
 * @param entryIndex - Index of the entry to issue a receipt for.
 * @returns The witness receipt with Merkle proof.
 * @throws If entryIndex is out of bounds.
 */
export function issueReceipt(
  entries: readonly ChainEntry[],
  entryIndex: number,
): WitnessReceipt {
  if (entryIndex < 0 || entryIndex >= entries.length) {
    throw new RangeError(
      `entryIndex ${entryIndex} out of bounds [0, ${entries.length - 1}]`,
    );
  }

  const leafHashes = entries.map((e) => e.hash);
  const tree = buildMerkleTree(leafHashes);
  const rootHash = tree[tree.length - 1]![0]!;
  const proof = extractProof(tree, entryIndex);
  const entry = entries[entryIndex]!;

  return {
    entryHash: entry.hash,
    rootHash,
    proof,
    issuedAt: new Date().toISOString(),
    entrySeq: entry.seq,
    chainLength: entries.length,
  };
}

/**
 * Validate a witness receipt against its own Merkle proof.
 *
 * Recomputes the root from the entry hash and proof path, then checks
 * it matches the receipt's rootHash.
 */
export function validateReceipt(receipt: WitnessReceipt): boolean {
  return verifyMerkleProof(receipt.entryHash, receipt.proof, receipt.rootHash);
}

/**
 * Persistent witness receipt store.
 *
 * Stores receipts as individual JSON files at `.claws/audit/receipts/{entryHash}.json`.
 * Lookup by entry hash is O(1) via the filesystem path.
 */
export class WitnessStore {
  private readonly receiptsDir: string;

  constructor(workspaceRoot: string) {
    this.receiptsDir = path.join(workspaceRoot, RECEIPTS_DIR);
  }

  /**
   * Store a witness receipt on disk.
   * Creates the receipts directory if it does not exist.
   */
  store(receipt: WitnessReceipt): void {
    validateEntryHash(receipt.entryHash);
    if (!fs.existsSync(this.receiptsDir)) {
      fs.mkdirSync(this.receiptsDir, { recursive: true });
    }
    const filePath = path.join(this.receiptsDir, `${receipt.entryHash}.json`);
    fs.writeFileSync(filePath, JSON.stringify(receipt, null, 2), 'utf8');
  }

  /**
   * Retrieve a receipt by entry hash. Returns undefined if not found.
   * O(1) lookup — file path is derived directly from the hash.
   */
  get(entryHash: string): WitnessReceipt | undefined {
    validateEntryHash(entryHash);
    const filePath = path.join(this.receiptsDir, `${entryHash}.json`);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as WitnessReceipt;
  }

  /**
   * Check whether a receipt exists for a given entry hash.
   */
  has(entryHash: string): boolean {
    validateEntryHash(entryHash);
    const filePath = path.join(this.receiptsDir, `${entryHash}.json`);
    return fs.existsSync(filePath);
  }

  /**
   * List all stored receipt entry hashes.
   */
  list(): string[] {
    if (!fs.existsSync(this.receiptsDir)) {
      return [];
    }
    return fs
      .readdirSync(this.receiptsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  }
}
