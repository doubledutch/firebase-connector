@doubledutch/firebase-connector
===============================

Convenience library for building DoubleDutch extensions with a preconfigured
Google Firebase backend.  See
[DoubleDutch extensions with React Native](https://doubledutch.github.io/rn/) for
more information.

# Usage

```bash
npm i --save @doubledutch/firebase-connector
```

```javascript
import client from '@doubledutch/rn-client'
import FirebaseConnector from '@doubledutch/firebase-connector'
const fbc = FirebaseConnector(client, 'myextension')

fbc.initializeAppWithSimpleBackend()
```

## API

- `initializeAppWithSimpleBackend()`: Calls
  [firebase.initializeApp()](https://firebase.google.com/docs/reference/node/firebase)
  with configuration providing access to DoubleDutch's Firebase backend, with
  database references secured and scoped at the event and attendee level. This
  function must be called when your extension is initializing, before attempting
  to use Firebase functionality.
- signin(): Returns a promise that resolves when authentication to the
  DoubleDutch extension backend is complete. Must be called after
  `initializeAppWithSimpleBackend()`, and must resolve before calling any of the
  following functions.
- signinAdmin(): Similar to `signin()` but should be called instead, when
  building an admin page for a DoubleDutch extension.

### Database

If you are using `initializeAppWithSimpleBackend()`, the following functions
will give references to keys in a Firebase Realtime Database with various levels
of secured access.  See the
[Firebase Realtime Database](https://firebase.google.com/docs/database/) guides
for more info, but skip the initialization steps.  The DoubleDutch
`firebase-connector` takes care of that for you, and provides easy access to
various levels of security.

#### Private

- `database.private.userRef(path)`: Gets a [Firebase ref][firebase-ref] to a key
  that is readable and writable only by the current attendee.
- `database.private.adminableUserRef(path)`: Gets a [Firesbase ref][firebase-ref]
  to a key that is readable and writable only by the current attendee or an
  event owner for the current event.
- `database.private.adminableUsersRef()`: Gets a [Firesbase ref][firebase-ref]
  to a key that is the root of all those provided by
  `database.private.adminableUserRef(path)` for all attendees in the current
  event. Keys under this ref will be the `id` of individual attendees.
- `database.private.tiersRef(path)`: Gets a [Firebase ref][firebase-ref] to a key
  that is writable only by an event owner for the current event, and readable
  by anyone in the specified tier. `default` is used as the key for the default tier.
- `database.private.adminRef(path)`: Gets a [Firebase ref][firebase-ref] to a key
  that is readable and writable only by an event owner for the current event.

#### Public

- `database.public.userRef(path)`: Gets a [Firebase ref][firebase-ref] to a key
  that is writable only by the current attendee, and readable by anyone
  authenticated to the current event.
- `database.public.usersRef()`: Gets a [Firebase ref][firebase-ref] to a key
  that is the root of all those provided by `database.public.userRef(path)` for
  all users in the current event. Keys under this ref will be the `id` of
  individual users.
- `database.public.adminRef(path)`: Gets a [Firebase ref][firebase-ref] to a key
  that is writable only by an event owner for the current event, and readable by
  anyone authenticated to the current event.
- `database.public.allRef(path)`: Gets a [Firebase ref][firebase-ref] to a key
  that is readable and writable by anyone authenticated to the current event.

[firebase-ref]: https://firebase.google.com/docs/reference/node/firebase.database.Reference