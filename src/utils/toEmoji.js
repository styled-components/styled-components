/* eslint-disable max-len */
/*
 * From: http://www.unicode.org/Public/emoji/1.0//emoji-data.txt
 *
 * Copy first column
 * const codes = `PASTE HERE`
 * const ints = codes.split("\n").map(c => parseInt(c, 16)).filter(int => int >= 8986)
 * const ranges = ints.sort((a,b) => a - b).reduce((arr, code) => (code - (arr[arr.length - 1] || {}).end <= 1) ? (arr[arr.length-1].end = code) && arr : arr.concat({start:code, end:code}), [])
 * ranges.map(range => range.start === range.end ? range.start.toString(16) : `${range.start.toString(16)}..${range.end.toString(16)}`).join(",").toUpperCase()
 * */

const emojiCodes = '231A..231B,2328,23CF,23E9..23F3,23F8..23FA,24C2,25AA..25AB,25B6,25C0,25FB..25FE,2600..2604,260E,2611,2614..2615,2618,261D,2620,2622..2623,2626,262A,262E..262F,2638..263A,2648..2653,2660,2663,2665..2666,2668,267B,267F,2692..2694,2696..2697,2699,269B..269C,26A0..26A1,26AA..26AB,26B0..26B1,26BD..26BE,26C4..26C5,26C8,26CE..26CF,26D1,26D3..26D4,26E9..26EA,26F0..26F5,26F7..26FA,26FD,2702,2705,2708..270D,270F,2712,2714,2716,271D,2721,2728,2733..2734,2744,2747,274C,274E,2753..2755,2757,2763..2764,2795..2797,27A1,27B0,27BF,2934..2935,2B05..2B07,2B1B..2B1C,2B50,2B55,3030,303D,3297,3299,1F004,1F0CF,1F170..1F171,1F17E..1F17F,1F18E,1F191..1F19A,1F1E6..1F1FF,1F201..1F202,1F21A,1F22F,1F232..1F23A,1F250..1F251,1F300..1F321,1F324..1F393,1F396..1F397,1F399..1F39B,1F39E..1F3F0,1F3F3..1F3F5,1F3F7..1F4FD,1F4FF..1F53D,1F549..1F54E,1F550..1F567,1F56F..1F570,1F573..1F579,1F587,1F58A..1F58D,1F590,1F595..1F596,1F5A5,1F5A8,1F5B1..1F5B2,1F5BC,1F5C2..1F5C4,1F5D1..1F5D3,1F5DC..1F5DE,1F5E1,1F5E3,1F5EF,1F5F3,1F5FA..1F64F,1F680..1F6C5,1F6CB..1F6D0,1F6E0..1F6E5,1F6E9,1F6EB..1F6EC,1F6F0,1F6F3,1F910..1F918,1F980..1F984,1F9C0'
const emojiList = emojiCodes.split(',').reduce((arr, range) => {
  const matches = /(\w+)\.\.(\w+)/.exec(range)
  if (matches) {
    const from = parseInt(matches[1], 16)
    const to = parseInt(matches[2], 16)
    return arr.concat(...Array((to - from) + 1).fill()
      .map((_, i) => from + i))
  } else {
    return arr.concat(parseInt(range, 16))
  }
}, [])

/* Some high number, usually 9-digit base-10. Map it to base-😎 */
const toEmoji = code => {
  const lastDigit = String.fromCodePoint(emojiList[code % emojiList.length])
  return code > emojiList.length ? `${toEmoji(Math.floor(code / emojiList.length))}${String.fromCodePoint(0x2006)}${lastDigit}` : lastDigit
}

export default toEmoji
