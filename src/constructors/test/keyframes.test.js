import expect from 'expect'
import { StyleSheet } from '../../vendor/glamor/sheet'

import _keyframes from '../keyframes'

/**
 * Setup
 */
let index = 0
const keyframes = _keyframes(() => `keyframe_${index++}`)
const getInjectedCSS = () => StyleSheet.instance.rules().map(rule => rule.cssText).join(' ')

describe('keyframes', () => {
  beforeEach(() => {
    if (StyleSheet.instance && StyleSheet.instance.sheet) StyleSheet.instance.flush()
    index = 0
  })

  it('should return its name', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `).toEqual('keyframe_0')
  })

  it('should insert the correct styles', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const name = keyframes`${rules}`
    expect(getInjectedCSS().replace(/\s+/g, ' ')).toEqual(`
      @keyframes keyframe_0 {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
    `.trim().replace(/\s+/g, ' '))
  })
})
