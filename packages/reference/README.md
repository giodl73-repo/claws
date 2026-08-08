# Claws Reference Parser

This experimental package contains the harness-neutral Claw v1 manifest types,
parser, and portability rules. It has no dependency on OpenClaw, ClawHub, or
another agent harness.

The parser accepts schema version 1 only. Native profile files and package-root
`BOOTSTRAP.md` are conventional package layers discovered by the CLI rather
than fields added to the portable manifest.

Harnesses may revalidate a package at their own trust boundary. Their profile
interpretation, capability policy, consent, mutation, provenance, and lifecycle
behavior do not belong in this package.

The package is not published. Public extraction, versioning, conformance, and
governance remain standards decisions.
