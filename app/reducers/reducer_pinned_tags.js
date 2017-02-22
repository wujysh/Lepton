'use strict'

import { UPDATE_PINNED_TAGS } from '../actions'

export default function (state = [], action) {
  switch (action.type) {
    case UPDATE_PINNED_TAGS:
      return [...action.payload]
    default:
  }
  return state
}
