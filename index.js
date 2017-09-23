import firebase from 'firebase'
import config from './config'

// Parameters
// - client  - A DoubleDutch environment-specific client, e.g. from @doubledutch/rn-client)
// - feature - The name of the Bazaar Feature from your bazaar.json // TODO: It would be nice if this were injected in the DD bindings.
export default function connector(doubleDutchClient, feature) {
  const { currentEvent } = doubleDutchClient
  return {
    initializeAppWithSimpleBackend,
    signin() { return signin(doubleDutchClient, feature) },
    database: {
      userPrivateRef(subPath) {
        return dbRef(`users/${firebase.auth().currentUser.uid}/private`, subPath)
      },
      userPublicRef(subPath) {
        return dbRef(`users/${firebase.auth().currentUser.uid}/public`, subPath)
      },
      adminPrivateRef(subPath) {
        return dbRef(`admin/private`, subPath)
      },
      adminPublicRef(subPath) {
        return dbRef(`admin/public`, subPath)
      },
      publicRef(subPath) {
        return dbRef(`public`, subPath)
      }
    }
  }

  function dbRef(midPath, subPath) {
    return firebase.database().ref(`simple/${feature}/events/${currentEvent.EventId}/${midPath}/${subPath || ''}`)
  }
}

// Firebase must be initialized with config before using Firebase.
// Either call `firebase.initializeApp(config) with config from your own
// Firebase project (https://firebase.google.com/docs/web/setup), or call
// `initializeAppWithSimpleBackend()` to use a preconfigured backend with
// Firebase Storage and Firebase Realtime Database.
// TODO: `firebase.initializeApp(config)` is not yet supported with custom auth tokens. It is possible to support a developer's own Firebase project, but we will have to expose a way to host their own `attendeeToken` cloud function in their own Firebase project in order for their tokens to be accepted.
export function initializeAppWithSimpleBackend() {
  firebase.initializeApp(config.firebase.default)
}

// Authenticates to Firebase by obtaining a DoubleDutch token and exchanging
// it for a custom Firebase token with `uid` and additional claims:
// - attendee
// - feature
// - eventId
// - userId
// - userIdentifierId
// - username
// - email
//
// Returns a Promise that resolves to the current user when Firebase authentication is complete
export function signin(doubleDutchClient, feature) {
  const { currentEvent, region } = doubleDutchClient

  return doubleDutchClient.getToken()
  .then(ddToken => fetch(`${config.firebase.cloudFunctions}/attendeeToken?event=${encodeURIComponent(currentEvent.EventId)}&feature=${encodeURIComponent(feature)}&region=${region}`, {
    headers: { authorization: `Bearer ${ddToken}` }
  }))
  .then(res => {
    if (!res.ok) throw new Error(`Signin error: ${res.status} ${res.statusText || ''}`)
    return res.text()
  })
  .then(firebaseToken => firebase.auth().signInWithCustomToken(firebaseToken))
}