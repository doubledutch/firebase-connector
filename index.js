import firebase from 'firebase'
import config from './config'

// Parameters
// - client  - A DoubleDutch environment-specific client, e.g. from @doubledutch/rn-client)
// - extension - The name of the DoubleDutch extension from your package.json // TODO: It would be nice if this were injected in the DD bindings.
export default function connector(doubleDutchClient, extension) {
  const { currentEvent } = doubleDutchClient
  return {
    initializeAppWithSimpleBackend,
    signin() { return signin(doubleDutchClient, extension) },
    database: {
      private: {
        userRef(subPath) {
          return dbRef(`private/total/users/${firebase.auth().currentUser.uid}`, subPath)
        },
        adminableUserRef(subPath) {
          return dbRef(`private/adminable/users/${firebase.auth().currentUser.uid}`, subPath)
        },
        adminRef(subPath) {
          return dbRef(`private/admin`, subPath)
        }
      },
      public: {
        userRef(subPath) {
          return dbRef(`public/users/${firebase.auth().currentUser.uid}`, subPath)
        },
        usersRef(subPath) {
          return dbRef(`public/users`, subPath)
        },
        adminRef(subPath) {
          return dbRef(`public/admin`, subPath)
        },
        allRef(subPath) {
          return dbRef(`public/all`, subPath)
        }
      }
    }
  }

  function dbRef(midPath, subPath) {
    return firebase.database().ref(`simple/${extension}/events/${currentEvent.id}/${midPath}/${subPath || ''}`)
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
// - extension
// - eventId
// - userId
// - userIdentifierId
// - username
// - email
//
// Returns a Promise that resolves to the current user when Firebase authentication is complete
export function signin(doubleDutchClient, extension) {
  const { currentEvent, region } = doubleDutchClient

  return doubleDutchClient.getToken()
  .then(ddToken => fetch(`${config.firebase.cloudFunctions}/attendeeToken?event=${encodeURIComponent(currentEvent.id)}&extension=${encodeURIComponent(extension)}&region=${region}`, {
    headers: { authorization: `Bearer ${ddToken}` }
  }))
  .then(res => {
    if (!res.ok) throw new Error(`Signin error: ${res.status} ${res.statusText || ''}`)
    return res.text()
  })
  .then(firebaseToken => firebase.auth().signInWithCustomToken(firebaseToken))
}