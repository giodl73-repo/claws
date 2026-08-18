# Scout Identity Thread Response

I think this is directionally right. The one adjustment I would make is to
separate three things that are getting collapsed in the thread:

1. **Cloud/resource authorization**: Cloud Scout is the gateway and uses Entra
   ID. If the gateway can use OBO for the human user, that may be the right
   near-term path for user-delegated operations and could let us proceed without
   waiting for the Agent User/WAM work.
2. **Node admission**: OpenClaw pairing answers whether a node is allowed to
   connect to the gateway and what capabilities it has. That is necessary, but
   it is not by itself the identity under which code runs on the device.
3. **Local execution and containment**: Process sandboxing with inherited user
   identity is one valid initial profile. Session MXC is a stronger and separate
   profile when we need an isolated execution identity/boundary, clearer
   attribution, and independent lifecycle or revocation.

So my current read is:

- SuperApp + Scout can use Entra ID at the product boundary and OpenClaw-style
  pairing for node admission.
- Human-user OBO may cover the near-term cloud authorization path.
- We should not make the generic upstream OpenClaw node responsible for
  Microsoft product identity policy.
- Session MXC remains important, but we need to be precise about the scenario it
  unlocks and whether it is an Ignite requirement, a stretch goal, or a
  post-Ignite dependency.
- Oceana should stay out of this model unless that team identifies a concrete
  shared contract.

I am meeting with Chris Anderson today and will use that discussion to connect
the identity and containment work: specifically, where OBO is sufficient, where
a separate agent/session principal is mandatory, and what delivery assumptions
we should make for Agent User/WAM and session MXC. I will bring the outcome back
so we can turn this into a small scenario/identity matrix with named owners
rather than one overloaded architecture diagram.
