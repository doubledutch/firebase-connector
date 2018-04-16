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

import {
  mapPushedDataToStateObjects, mapPushedDataToObjectOfStateObjects,
  mapPerUserPrivateAdminablePushedDataToStateObjects, mapPerUserPublicPushedDataToStateObjects,
  mapPerUserPrivateAdminablePushedDataToObjectOfStateObjects, mapPerUserPublicPushedDataToObjectOfStateObjects,
  reducePerUserPublicDataToStateCount, reducePerUserPrivateAdminableDataToStateCount,
} from './helpers'

test('mapPushedDataToStateObjects', () => {
  const fbc = mockFirebaseConnector()
  const comp = mockComponent()
  mapPushedDataToStateObjects(fbc.database.public.usersRef(), comp, 'sData')

  fbc.handlers.publicUsersRef.child_added({key: 'abc', val() { return {x:5} }})
  fbc.handlers.publicUsersRef.child_added({key: 'def', val() { return {x:15} }})

  expect(comp.state.sData).toEqual({
    abc: {x: 5, id: 'abc'},
    def: {x: 15, id: 'def'},
  })

  fbc.handlers.publicUsersRef.child_changed({key: 'abc', val() { return {x:10} }})

  expect(comp.state.sData).toEqual({
    abc: {x: 10, id: 'abc'},
    def: {x: 15, id: 'def'},
  })

  fbc.handlers.publicUsersRef.child_removed({key: 'abc', val() { return {x:10} }})

  expect(comp.state.sData).toEqual({
    def: {x: 15, id: 'def'},
  })
})

test('mapPushedDataToObjectOfStateObjects', () => {
  const fbc = mockFirebaseConnector()
  const comp = mockComponent()
  comp.state.sData = {}
  mapPushedDataToObjectOfStateObjects(fbc.database.public.usersRef(), comp, 'sData', (key, val) => val.questionId)

  fbc.handlers.publicUsersRef.child_added({key: 'abc', val() { return {questionId: 'q1', x: 5} }})
  fbc.handlers.publicUsersRef.child_added({key: 'def', val() { return {questionId: 'q1', x: 10} }})
  fbc.handlers.publicUsersRef.child_added({key: 'ghi', val() { return {questionId: 'q2', x: 15} }})

  expect(comp.state.sData).toEqual({
    q1: {
      abc: {id: 'abc', questionId: 'q1', x: 5},
      def: {id: 'def', questionId: 'q1', x: 10},
    },
    q2: {ghi: {id: 'ghi', questionId: 'q2', x: 15}},
  })

  fbc.handlers.publicUsersRef.child_changed({key: 'def', val() { return {questionId: 'q1', x: 20} }})

  expect(comp.state.sData).toEqual({
    q1: {
      abc: {id: 'abc', questionId: 'q1', x: 5},
      def: {id: 'def', questionId: 'q1', x: 20},
    },
    q2: {ghi: {id: 'ghi', questionId: 'q2', x: 15}},
  })

  fbc.handlers.publicUsersRef.child_removed({key: 'def', val() { return {questionId: 'q1', x: 20} }})

  expect(comp.state.sData).toEqual({
    q1: {abc: {id: 'abc', questionId: 'q1', x: 5}},
    q2: {ghi: {id: 'ghi', questionId: 'q2', x: 15}},
  })
})

test('mapPerUser-PushedDataToStateObjects', () => {
  doTest(mapPerUserPublicPushedDataToStateObjects, 'publicUsersRef')
  doTest(mapPerUserPrivateAdminablePushedDataToStateObjects, 'privateAdminableUsersRef')

  function doTest(fn, handlerName) {
    const fbc = mockFirebaseConnector()
    const comp = mockComponent()
    fn(fbc, 'fData', comp, 'sData', (userId, key, value) => key)

    fbc.handlers[handlerName].child_added({
      key: '1234',
      val() { return { fData: {a: {x:5}, b: {x:10}} } }
    })
    fbc.handlers[handlerName].child_added({
      key: '5678',
      val() { return { fData: {c: {x:15}} } }
    })

    expect(comp.state.sData).toEqual({
      a: {x: 5, userId: '1234', id: 'a'},
      b: {x: 10, userId: '1234', id: 'b'},
      c: {x: 15, userId: '5678', id: 'c'},
    })

    fbc.handlers[handlerName].child_changed({
      key: '1234',
      val() { return { fData: {a: {x:11}, b: {x:10}} } }
    })

    expect(comp.state.sData).toEqual({
      a: {x: 11, userId: '1234', id: 'a'},
      b: {x: 10, userId: '1234', id: 'b'},
      c: {x: 15, userId: '5678', id: 'c'},
    })

    fbc.handlers[handlerName].child_removed({key: '1234'})

    expect(comp.state.sData).toEqual({
      c: {x: 15, userId: '5678', id: 'c'},
    })
  }
})

test('mapPerUser-PushedDataToObjectOfStateObjects', () => {
  doTest(mapPerUserPublicPushedDataToObjectOfStateObjects, 'publicUsersRef')
  doTest(mapPerUserPrivateAdminablePushedDataToObjectOfStateObjects, 'privateAdminableUsersRef')

  function doTest(fn, handlerName) {
    const fbc = mockFirebaseConnector()
    const comp = mockComponent()
    comp.state.sData = {}
    fn(fbc, 'fData', comp, 'sData', (userId, key, val) => val.questionId, (userId, key, val) => key)
  
    fbc.handlers[handlerName].child_added({
      key: '1234',
      val() { return { fData: {a: {questionId: 'q1', x:5}, b: {questionId: 'q2', x:10}} } }
    })
    fbc.handlers[handlerName].child_added({
      key: '5678',
      val() { return { fData: {c: {questionId: 'q1', x:15}} } }
    })
  
    expect(comp.state.sData).toEqual({
      q1: {
        a: {id: 'a', questionId: 'q1', userId: '1234', x: 5},
        c: {id: 'c', questionId: 'q1', userId: '5678', x: 15},
      },
      q2: {
        b: {id: 'b', questionId: 'q2', userId: '1234', x: 10},
      }
    })
  
    fbc.handlers[handlerName].child_changed({
      key: '1234',
      val() { return { fData: {a: {questionId: 'q1', x:5} } } }
    })  
  
    expect(comp.state.sData).toEqual({
      q1: {
        a: {id: 'a', questionId: 'q1', userId: '1234', x: 5},
        c: {id: 'c', questionId: 'q1', userId: '5678', x: 15},
      }
    })
  
    fbc.handlers[handlerName].child_removed({
      key: '1234',
      val() { return { fData: {a: {questionId: 'q1', x:5} } } }
    })  
  
    expect(comp.state.sData).toEqual({
      q1: {
        c: {id: 'c', questionId: 'q1', userId: '5678', x: 15},
      }
    })
  }
})

test('reducePerUserPrivateAdminableDataToStateCount', () => {
  doTest(reducePerUserPublicDataToStateCount, 'publicUsersRef')
  doTest(reducePerUserPrivateAdminableDataToStateCount, 'privateAdminableUsersRef')

  function doTest(fn, handlerName) {
    const fbc = mockFirebaseConnector()
    const comp = mockComponent()
    fn(fbc, 'fData', comp, 'sData', (userId, key, value) => key)

    fbc.handlers[handlerName].child_added({
      key: '1234',
      val() { return { fData: {a: {x:5}, b: {x:10}} } }
    })
    fbc.handlers[handlerName].child_added({
      key: '5678',
      val() { return { fData: {b: {x:15}} } }
    })

    expect(comp.state.sData).toEqual({
      a: 1,
      b: 2,
    })
  }
})

function mockFirebaseConnector() {
  const fbc = {
    handlers: {
      privateAdminableUsersRef: {},
      publicUsersRef: {}
    },
    database: {
      public: {
        usersRef() {
          return {
            on(event, handler) {
              fbc.handlers.publicUsersRef[event] = handler
            }
          }
        }
      },
      private: {
        adminableUsersRef() {
          return {
            on(event, handler) {
              fbc.handlers.privateAdminableUsersRef[event] = handler
            }
          }
        }            
      }
    }
  }
  return fbc
}

function mockComponent() {
  const state = {}
  const comp = {
    state,
    setState(updates) {
      const updateKeyValuePairs = (typeof updates === 'function') ? updates(state) : updates
      Object.keys(updateKeyValuePairs).forEach(k => state[k] = updateKeyValuePairs[k])
    }
  }
  return comp
}
