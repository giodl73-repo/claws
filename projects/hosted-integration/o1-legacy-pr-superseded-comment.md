Superseded by #114773, which implements the review recommendation to retain
only the local, behavior-preserving one-hop extraction.

The replacement is rebased onto current `main`, linked to #114772, and removes
the proposed `network-guard/v1` profile and all future connection-owner
contract surface. Closing this broader draft so there is one canonical landing
path.
