/*
 * Copyright 2018 DoubleDutch, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import firebase from 'firebase'
import config from './config'
export * from './helpers'

// Parameters
// - client  - A DoubleDutch environment-specific client, e.g. from @doubledutch/rn-client)
// - extension - The name of the DoubleDutch extension from your package.json // TODO: It would be nice if this were injected in the DD bindings.
export default function connector(doubleDutchClient, extension) {
  const { currentUser } = doubleDutchClient
  return {
    initializeAppWithSimpleBackend,
    signin() { return signin(doubleDutchClient, extension) },
    signinAdmin() { return signinAdmin(doubleDutchClient, extension) },
    getLongLivedAdminToken() {
      if (doubleDutchClient.longLivedToken) return Promise.resolve(doubleDutchClient.longLivedToken)
      return getToken('adminLongLived', doubleDutchClient, extension)
    },
    database: {
      private: {
        userRef(subPath) {
          return dbRef(`private/total/users/${currentUser.id}`, subPath)
        },
        adminableUserRef(subPath) {
          return dbRef(`private/adminable/users/${currentUser.id}`, subPath)
        },
        adminableUsersRef(subPath) {
          return dbRef(`private/adminable/users`, subPath)
        },
        tiersRef(subPath) {
          return dbRef(`private/adminable/tiers`, subPath)
        },
        adminRef(subPath) {
          return dbRef(`private/admin`, subPath)
        }
      },
      public: {
        userRef(subPath) {
          return dbRef(`public/users/${currentUser.id}`, subPath)
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
    const { currentEvent } = doubleDutchClient
    if (!currentEvent) throw 'currentEvent is not yet known in this environment. Wait until signin() or signinAdmin() has resolved.'
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
// - type: 'attendee'
// - extension
// - eventId
// - userId
// - userIdentifierId
// - username
// - email
//
// Returns a Promise that resolves to the current user when Firebase authentication is complete
export function signin(doubleDutchClient, extension) {
  return signinType('attendee', doubleDutchClient, extension)  
}

function signinAdmin(doubleDutchClient, extension) {
  if (doubleDutchClient.longLivedToken) {
    const [eventId, region] = doubleDutchClient.longLivedToken.split(':', 2)
    doubleDutchClient.region = region
    doubleDutchClient.currentEvent = { id: eventId }
    return fetch(`${config.firebase.cloudFunctions}/adminToken`, {
      headers: { authorization: `Bearer jwt-${doubleDutchClient.longLivedToken}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`Signin error: ${res.status} ${res.statusText || ''}`)
      return res.text()
    })
    .then(firebaseToken => firebase.auth().signInWithCustomToken(firebaseToken))
  } else {
    return signinType('admin', doubleDutchClient, extension)
  }
}

function getToken(type, client, extension){
  return client.getToken()
  .then(ddToken => fetch(`${config.firebase.cloudFunctions}/${type}Token?event=${encodeURIComponent(client.currentEvent.id)}&extension=${encodeURIComponent(extension)}&region=${client.region}`, {
    headers: { authorization: `Bearer ${ddToken}` }
  }))
  .then(res => {
    if (!res.ok) throw new Error(`Signin error: ${res.status} ${res.statusText || ''}`)
    return res.text()
  })
}

function signinType(type, client, extension) {
  return getToken(type, client, extension)
  .then(firebaseToken => firebase.auth().signInWithCustomToken(firebaseToken))
}
