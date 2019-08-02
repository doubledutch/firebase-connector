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

import firebase from '@firebase/app'
import 'firebase/auth'
import 'firebase/database'
import config from './config'
export {
  mapPushedDataToStateObjects, mapPushedDataToObjectOfStateObjects,
  mapPerUserPrivateAdminablePushedDataToStateObjects, mapPerUserPublicPushedDataToStateObjects, mapPerExhibitorStaffPushedDataToStateObjects,
  mapPerUserPrivateAdminablePushedDataToObjectOfStateObjects, mapPerUserPublicPushedDataToObjectOfStateObjects,
  reducePerUserPublicDataToStateCount, reducePerUserPrivateAdminableDataToStateCount,
} from './helpers'

// TODO: It would be nice if the extension were injected in the DD bindings.

/** 
 * @param {*} client DoubleDutch environment-specific client, e.g. from @doubledutch/rn-client)
 * @param {string} extension The name of the DoubleDutch extension from your package.json
 */
export default getFirebaseConnector

async function getFirebaseConnector(doubleDutchClient, extension) {
  if (doubleDutchClient.longLivedToken) {
    const [eventId, region] = doubleDutchClient.longLivedToken.split(':', 2)
    doubleDutchClient.region = region
    doubleDutchClient.setCurrentEvent({ id: eventId })
  }
  const currentUser = await doubleDutchClient.getCurrentUser()
  const currentEvent = await doubleDutchClient.getCurrentEvent()
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
        },
        userMessagesRef(receiverId, senderId) {
          return dbRef(`private/total/userMessages/${receiverId}`, senderId)
        },
        adminableUserMessagesRef(receiverId, senderId) {
          return dbRef(`private/adminable/userMessages/${receiverId}`, senderId)
        },
        adminMessagesRef(senderId) {
          return dbRef(`private/adminMessages`, senderId)
        },
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
      },
      exhibitors: {
        staffRef(exhibitorId, subPath) {
          return dbRef(`exhibitors/${exhibitorId}/staff/${currentUser.id}`, subPath)
        },
        allStaffRef(exhibitorId, subPath) {
          return dbRef(`exhibitors/${exhibitorId}/staff`, subPath)
        },
        adminPrivateRef(exhibitorId, subPath) {
          return dbRef(`exhibitors/${exhibitorId}/admin/private`, subPath)
        },
        adminPublicRef(exhibitorId, subPath) {
          return dbRef(`exhibitors/${exhibitorId}/admin/public`, subPath)
        },
      },
    }
  }

  function dbRef(midPath, subPath) {
    return firebase.database().ref(`simple/${extension}/events/${currentEvent.id}/${midPath}/${subPath || ''}`)
  }
}

// TODO: `firebase.initializeApp(config)` is not yet supported with custom auth tokens. It is possible to support a developer's own Firebase project, but we will have to expose a way to host their own `attendeeToken` cloud function in their own Firebase project in order for their tokens to be accepted.

/**
 * Firebase must be initialized with config before using Firebase.
 * Either call `firebase.initializeApp(config) with config from your own
 * Firebase project (https://firebase.google.com/docs/web/setup), or call
 * `initializeAppWithSimpleBackend()` to use a preconfigured backend with
 * Firebase Storage and Firebase Realtime Database.
 */
export function initializeAppWithSimpleBackend() {
  firebase.initializeApp(config.firebase.default)
}

/**
 * Authenticates to Firebase by obtaining a DoubleDutch token and exchanging
 * it for a custom Firebase token with `uid` and additional claims:
 * type: 'attendee'
 * extension
 * eventId
 * userId
 * userIdentifierId
 * username
 * email

 * @param {*} doubleDutchClient 
 * @param {string} extension 
 */
export function signin(doubleDutchClient, extension) {
  return signinType('attendee', doubleDutchClient, extension)  
}

function signinAdmin(doubleDutchClient, extension) {
  if (doubleDutchClient.longLivedToken) {
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
  .then(ddToken =>
    client.getCurrentEvent().then(currentEvent =>
      fetch(`${config.firebase.cloudFunctions}/${type}Token?event=${encodeURIComponent(currentEvent.id)}&extension=${encodeURIComponent(extension)}&region=${client.region}`, {
        headers: { authorization: `Bearer ${ddToken}` }
      })
    )
  )
  .then(res => {
    if (!res.ok) throw new Error(`Signin error: ${res.status} ${res.statusText || ''}`)
    return res.text()
  })
}

function signinType(type, client, extension) {
  return getToken(type, client, extension)
  .then(firebaseToken => firebase.auth().signInWithCustomToken(firebaseToken))
}

export function provideFirebaseConnectorToReactComponent(client, extensionName, renderWrappedComponent, PureComponent) {
  return class FbcManager extends PureComponent {
    constructor(props) {
      super(props)
      this.state = {}
    }

    componentDidMount() {
      getFirebaseConnector(client, extensionName).then(fbc => {
        fbc.initializeAppWithSimpleBackend()
        this.setState({fbc})
      })
    }
  
    render() {
      const {fbc} = this.state
      if (!fbc) return null
      return renderWrappedComponent(this.props, fbc)
    }
  }
}
