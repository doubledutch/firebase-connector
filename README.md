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
import getFirebaseConnector from '@doubledutch/firebase-connector'
const fbcPromise = getFirebaseConnector(client, 'myextension').then(fbc => {
  fbc.initializeAppWithSimpleBackend()
})
```

## API

The exported `getFirebaseConnector` is a function `(client, extensionName) => Promise<FirebaseConnector>`

A `FirebaseConnector` resolved from the Promise returned by `getFirebaseConnector` has the following
functions and properties available:

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

- `database.private.userRef(path)`: `private/total/users/:id` : Gets a [Firebase ref][firebase-ref] to a key
  that is readable and writable only by the current attendee.
- `database.private.adminableUserRef(path)`: `private/adminable/users/:id` : Gets a [Firebase ref][firebase-ref]
  to a key that is readable and writable only by the current attendee or an
  event owner for the current event.
- `database.private.adminableUsersRef()`: `private/adminable/users` : Gets a [Firebase ref][firebase-ref]
  to a key that is the root of all those provided by
  `database.private.adminableUserRef(path)` for all attendees in the current
  event. Keys under this ref will be the `id` of individual attendees.
- `database.private.tiersRef(path)`: `private/adminable/tiers` : Gets a [Firebase ref][firebase-ref] to a key
  that is writable only by an event owner for the current event, and readable
  by anyone in the specified tier. `default` is used as the key for the default tier.
- `database.private.adminRef(path)`: `private/admin` : Gets a [Firebase ref][firebase-ref] to a key
  that is readable and writable only by an event owner for the current event.
- `database.private.userMessagesRef(receiverId, [senderId])`: `private/total/userMessages/:receiverId/:senderId` :
  Gets a [Firebase ref][firebase-ref] to a key that holds messages from various other attendees.
  - If `senderId` is specified, the ref contains any messages sent to `receiverId` from `senderId` and is
    readable by sender and receiver, writable by the sender, and deletable (but not otherwise modifiable)
    by the receiver.
  - If `senderId` is undefined, the ref contains keys of any `senderId`s that have sent messages, which can
    be enumerated to see all senders, but only by the receiver.
- `database.private.adminableUserMessagesRef(receiverId, [senderId])`: `private/adminable/userMessages/:receiverId/:senderId` :
  Gets a [Firebase ref][firebase-ref] to a key that holds messages from various other attendees that
  is also readable/writable by an event owner for the current event.
  - If `senderId` is specified, the ref contains any messages sent to `receiverId` from `senderId` and is
    readable by sender and receiver, writable by the sender, and deletable (but not otherwise modifiable)
    by the receiver.
  - If `senderId` is undefined, the ref contains keys of any `senderId`s that have sent messages, which can
    be enumerated to see all senders, but only by the receiver.
- `database.private.adminMessagesRef([senderId])`: `private/adminMessages/:senderId` :
  Gets a [Firebase ref][firebase-ref] to a key that holds messages from various attendees to event organizers.
  - If `senderId` is specified, the ref contains any messages sent from `senderId` and is
    readable by the sender and event organizers, writable by the sender, and deletable (but not otherwise modifiable)
    by the event organizers.
  - If `senderId` is undefined, the ref contains keys of any `senderId`s that have sent messages, which can
    be enumerated to see all senders, but only by event organizers.

#### Public

- `database.public.userRef(path)`: `public/users/:id` : Gets a [Firebase ref][firebase-ref] to a key
  that is writable only by the current attendee, and readable by anyone
  authenticated to the current event.
- `database.public.usersRef()` : `public/users` : Gets a [Firebase ref][firebase-ref] to a key
  that is the root of all those provided by `database.public.userRef(path)` for
  all users in the current event. Keys under this ref will be the `id` of
  individual users.
- `database.public.adminRef(path)`: `public/admin` : Gets a [Firebase ref][firebase-ref] to a key
  that is writable only by an event owner for the current event, and readable by
  anyone authenticated to the current event.
- `database.public.allRef(path)`: `public/all` : Gets a [Firebase ref][firebase-ref] to a key
  that is readable and writable by anyone authenticated to the current event.

### Helpers

#### provideFirebaseConnectorToReactComponent

In React projects, create a single FirebaseConnector, and provide it to your root component.
Export the result as your root component. This ensures that `WrappedComponent` will not be
rendered until `fbc` is ready.

```jsx
export default provideFirebaseConnectorToReactComponent(client, 'myextension', (props, fbc) =>
  <WrappedComponent {...props} fbc={fbc} />, PureComponent)

class WrappedComponent extends PureComponent {
  componentDidMount() {
    this.props.fbc...
  }

  render() {
    return <div>Hello, world!</div>
  }
}
```

The following functions are provided to aid in mapping data in firebase to
state in a React Component. These functions set up subscriptions to
`child_added`, `child_changed`, and `child_removed` events.

#### Map data to state

- `mapPushedDataToStateObjects(ref, component, stateKey, keyFn)`
  Turns firebase objects stored immediately under the given ref into state at
  `[stateKey]: { [key]: {...value, id: key} }`
  where `key` is `keyFn(keyInData, valueInData)` if `keyFn` is specified, otherwise
  the firebase key.

- `mapPushedDataToObjectOfStateObjects(ref, component, stateKey, keyFn, subKeyFn)`
  Turns firebase objects stored immediately under the given ref into state at
  `[stateKey]: { [key]: { [subKey]: {...value, id: key} } }`
  where `key`    = `keyFn(keyInData, valueInData)`
  and   `subKey` = `subKeyFn(userId, keyInUserData, value)` if `subKeyFn` is specified,
  otherwise the firebase key.


#### Map per-user data to state

- `mapPerUserPrivateAdminablePushedDataToStateObjects(fbc, userRefKey, component, stateKey, keyFn)`
  Turns firebase objects `{...value}` with paths `/public/users/:userId/:userRefKey/:keyInUserData`
  into state at `[stateKey]: { [key]: {...value, userId, id: key} }`
  where `key` = `keyFn(userId, keyInUserData, value)`

- `mapPerUserPublicPushedDataToStateObjects(fbc, userRefKey, component, stateKey, keyFn)`
  Turns firebase objects `{...value}` with paths `/private/adminable/users/:userId/:userRefKey/:keyInUserData`
  into state at `[stateKey]: { [key]: {...value, userId, id: key} }`
  where `key` = `keyFn(userId, keyInUserData, value)`

- `mapPerUserPrivateAdminablePushedDataToObjectOfStateObjects(fbc, userRefKey, component, stateKey, keyFn, subKeyFn)`
  Turns firebase objects `{...value}` with paths `/public/users/:userId/:userRefKey/:keyInUserData`
  into state at `[stateKey]: { [key]: {[subKey]: {...value, userId, key} } }`
  where `key` =    `keyFn(userId, keyInUserData, value)`
  and   `subKey` = `subKeyFn(userId, keyInUserData, value)`

- `mapPerUserPublicPushedDataToObjectOfStateObjects(fbc, userRefKey, component, stateKey, keyFn, subKeyFn)`
  Turns firebase objects `{...value}` with paths `/private/adminable/users/:userId/:userRefKey/:keyInUserData`
  into state at `[stateKey]: { [key]: {[subKey]: {...value, userId, key} } }`
  where `key` =    `keyFn(userId, keyInUserData, value)`
  and   `subKey` = `subKeyFn(userId, keyInUserData, value)`

#### Count per-user data

- `reducePerUserPublicDataToStateCount(fbc, userRefKey, component, stateKey, keyFn)`
  Turns firebase objects `{...value} ` with paths `/public/users/:userId/:userRefKey/:keyInUserData`
  into state at `[stateKey]: { [key]: count }`
  where `key`   = `keyFn(userId, keyInUserData, value)`
  and   `count` = the number of objects from all users with `[key]`

- `reducePerUserPrivateAdminableDataToStateCount(fbc, userRefKey, component, stateKey, keyFn)`
  Turns firebase objects `{...value} ` with paths `/private/adminable/:userId/:userRefKey/:keyInUserData`
  into state at `[stateKey]: { [key]: count }`
  where `key`   = `keyFn(userId, keyInUserData, value)`
  and   `count` = the number of objects from all users with `[key]`

[firebase-ref]: https://firebase.google.com/docs/reference/node/firebase.database.Reference
