/*
 *          __        ___
 *    _____/ /___  __/ (_)____
 *   / ___/ __/ / / / / / ___/
 *  (__  ) /_/ /_/ / / (__  )
 * /____/\__/\__, /_/_/____/
 *          /____/
 *
 * light - weight css preprocessor @licence MIT
 *
 * v3.5.3 run through google closure compiler advanced mode
 */
var pa = function fa(ha) {
  function V(e, d, b, l, a) {
    for (
      var g = 0,
        c = 0,
        q = 0,
        f = 0,
        p,
        h,
        v = 0,
        w = 0,
        E = 0,
        z = 0,
        F = 0,
        m = 0,
        A = 0,
        n = 0,
        t = 0,
        O = 0,
        M = 0,
        r = 0,
        B = b.length,
        y = B - 1,
        k = '',
        u = '',
        H = '',
        N = '',
        I;
      n < B;

    ) {
      h = b.charCodeAt(n);
      n === y &&
        0 !== c + f + q + g &&
        (0 !== c && (h = 47 === c ? 10 : 47), (f = q = g = 0), B++, y++);
      if (0 === c + f + q + g) {
        if (n === y && (0 < t && (k = k.replace(Q, '')), 0 < k.trim().length)) {
          switch (h) {
            case 32:
            case 9:
            case 59:
            case 13:
            case 10:
              break;
            default:
              k += b.charAt(n);
          }
          h = 59;
        }
        if (1 === O)
          switch (h) {
            case 123:
            case 125:
            case 59:
            case 34:
            case 39:
            case 40:
            case 41:
            case 44:
              O = 0;
            case 9:
            case 13:
            case 10:
            case 32:
              break;
            default:
              for (O = 0, r = n, p = h, n--, h = 59; r < B; )
                switch (b.charCodeAt(r++)) {
                  case 10:
                  case 13:
                  case 59:
                    ++n;
                    h = p;
                    r = B;
                    break;
                  case 58:
                    0 < t && (++n, (h = p));
                  case 123:
                    r = B;
                }
          }
        switch (h) {
          case 123:
            k = k.trim();
            p = k.charCodeAt(0);
            z = 1;
            for (r = ++n; n < B; ) {
              switch ((h = b.charCodeAt(n))) {
                case 123:
                  z++;
                  break;
                case 125:
                  z--;
                  break;
                case 47:
                  switch ((h = b.charCodeAt(n + 1))) {
                    case 42:
                    case 47:
                      a: {
                        for (m = n + 1; m < y; ++m)
                          switch (b.charCodeAt(m)) {
                            case 47:
                              if (42 === h && 42 === b.charCodeAt(m - 1) && n + 2 !== m) {
                                n = m + 1;
                                break a;
                              }
                              break;
                            case 10:
                              if (47 === h) {
                                n = m + 1;
                                break a;
                              }
                          }
                        n = m;
                      }
                  }
                  break;
                case 91:
                  h++;
                case 40:
                  h++;
                case 34:
                case 39:
                  for (; n++ < y && b.charCodeAt(n) !== h; );
              }
              if (0 === z) break;
              n++;
            }
            m = b.substring(r, n);
            0 === p && (p = (k = k.replace(qa, '').trim()).charCodeAt(0));
            switch (p) {
              case 64:
                0 < t && (k = k.replace(Q, ''));
                h = k.charCodeAt(1);
                switch (h) {
                  case 100:
                  case 109:
                  case 115:
                  case 45:
                    t = d;
                    break;
                  default:
                    t = W;
                }
                m = V(d, t, m, h, a + 1);
                r = m.length;
                0 < X && 0 === r && (r = k.length);
                0 < G &&
                  ((t = ia(W, k, M)),
                  (I = P(3, m, t, d, J, C, r, h, a, l)),
                  (k = t.join('')),
                  void 0 !== I && 0 === (r = (m = I.trim()).length) && ((h = 0), (m = '')));
                if (0 < r)
                  switch (h) {
                    case 115:
                      k = k.replace(ra, sa);
                    case 100:
                    case 109:
                    case 45:
                      m = k + '{' + m + '}';
                      break;
                    case 107:
                      k = k.replace(ta, '$1 $2' + (0 < R ? T : ''));
                      m = k + '{' + m + '}';
                      m =
                        1 === x || (2 === x && U('@' + m, 3)) ? '@-webkit-' + m + '@' + m : '@' + m;
                      break;
                    default:
                      (m = k + m), 112 === l && (m = ((u += m), ''));
                  }
                else m = '';
                break;
              default:
                m = V(d, ia(d, k, M), m, l, a + 1);
            }
            H += m;
            m = M = t = A = O = F = 0;
            k = '';
            h = b.charCodeAt(++n);
            break;
          case 125:
          case 59:
            k = (0 < t ? k.replace(Q, '') : k).trim();
            if (1 < (r = k.length))
              switch (
                (0 === A &&
                  ((p = k.charCodeAt(0)), 45 === p || (96 < p && 123 > p)) &&
                  (r = (k = k.replace(' ', ':')).length),
                0 < G &&
                  void 0 !== (I = P(1, k, d, e, J, C, u.length, l, a, l)) &&
                  0 === (r = (k = I.trim()).length) &&
                  (k = '\x00\x00'),
                (p = k.charCodeAt(0)),
                (h = k.charCodeAt(1)),
                p)
              ) {
                case 0:
                  break;
                case 64:
                  if (105 === h || 99 === h) {
                    N += k + b.charAt(n);
                    break;
                  }
                default:
                  58 !== k.charCodeAt(r - 1) && (u += Y(k, p, h, k.charCodeAt(2)));
              }
            M = t = A = O = F = 0;
            k = '';
            h = b.charCodeAt(++n);
        }
      }
      switch (h) {
        case 13:
        case 10:
          if (0 === c + f + q + g + ja)
            switch (E) {
              case 41:
              case 39:
              case 34:
              case 64:
              case 126:
              case 62:
              case 42:
              case 43:
              case 47:
              case 45:
              case 58:
              case 44:
              case 59:
              case 123:
              case 125:
                break;
              default:
                0 < A && (O = 1);
            }
          47 === c ? (c = 0) : 0 === D + F && 107 !== l && 0 < k.length && ((t = 1), (k += '\x00'));
          0 < G * ka && P(0, k, d, e, J, C, u.length, l, a, l);
          C = 1;
          J++;
          break;
        case 59:
        case 125:
          if (0 === c + f + q + g) {
            C++;
            break;
          }
        default:
          C++;
          p = b.charAt(n);
          switch (h) {
            case 9:
            case 32:
              if (0 === f + g + c)
                switch (v) {
                  case 44:
                  case 58:
                  case 9:
                  case 32:
                    p = '';
                    break;
                  default:
                    32 !== h && (p = ' ');
                }
              break;
            case 0:
              p = '\\0';
              break;
            case 12:
              p = '\\f';
              break;
            case 11:
              p = '\\v';
              break;
            case 38:
              0 === f + c + g && 0 < D && ((t = M = 1), (p = '\f' + p));
              break;
            case 108:
              if (0 === f + c + g + K && 0 < A)
                switch (n - A) {
                  case 2:
                    112 === v && 58 === b.charCodeAt(n - 3) && (K = v);
                  case 8:
                    111 === w && (K = w);
                }
              break;
            case 58:
              0 === f + c + g && (A = n);
              break;
            case 44:
              0 === c + q + f + g && ((t = 1), (p += '\r'));
              break;
            case 34:
            case 39:
              0 === c && (f = f === h ? 0 : 0 === f ? h : f);
              break;
            case 91:
              0 === f + c + q && g++;
              break;
            case 93:
              0 === f + c + q && g--;
              break;
            case 41:
              0 === f + c + g && q--;
              break;
            case 40:
              if (0 === f + c + g) {
                if (0 === F)
                  switch (2 * v + 3 * w) {
                    case 533:
                      break;
                    default:
                      (z = 0), (F = 1);
                  }
                q++;
              }
              break;
            case 64:
              0 === c + q + f + g + A + m && (m = 1);
              break;
            case 42:
            case 47:
              if (!(0 < f + g + q))
                switch (c) {
                  case 0:
                    switch (2 * h + 3 * b.charCodeAt(n + 1)) {
                      case 235:
                        c = 47;
                        break;
                      case 220:
                        (r = n), (c = 42);
                    }
                    break;
                  case 42:
                    47 === h &&
                      42 === v &&
                      r + 2 !== n &&
                      (33 === b.charCodeAt(r + 2) && (u += b.substring(r, n + 1)),
                      (p = ''),
                      (c = 0));
                }
          }
          if (0 === c) {
            if (0 === D + f + g + m && 107 !== l && 59 !== h)
              switch (h) {
                case 44:
                case 126:
                case 62:
                case 43:
                case 41:
                case 40:
                  if (0 === F) {
                    switch (v) {
                      case 9:
                      case 32:
                      case 10:
                      case 13:
                        p += '\x00';
                        break;
                      default:
                        p = '\x00' + p + (44 === h ? '' : '\x00');
                    }
                    t = 1;
                  } else
                    switch (h) {
                      case 40:
                        A + 7 === n && 108 === v && (A = 0);
                        F = ++z;
                        break;
                      case 41:
                        0 === (F = --z) && ((t = 1), (p += '\x00'));
                    }
                  break;
                case 9:
                case 32:
                  switch (v) {
                    case 0:
                    case 123:
                    case 125:
                    case 59:
                    case 44:
                    case 12:
                    case 9:
                    case 32:
                    case 10:
                    case 13:
                      break;
                    default:
                      0 === F && ((t = 1), (p += '\x00'));
                  }
              }
            k += p;
            32 !== h && 9 !== h && (E = h);
          }
      }
      w = v;
      v = h;
      n++;
    }
    r = u.length;
    0 < X &&
      0 === r &&
      0 === H.length &&
      (0 === d[0].length) === !1 &&
      (109 !== l || (1 === d.length && (0 < D ? L : S) === d[0])) &&
      (r = d.join(',').length + 2);
    if (0 < r) {
      if (0 === D && 107 !== l) {
        b = 0;
        g = d.length;
        for (c = Array(g); b < g; ++b) {
          v = d[b].split(ua);
          w = '';
          E = 0;
          for (B = v.length; E < B; ++E)
            if (!(0 === (z = (f = v[E]).length) && 1 < B)) {
              n = w.charCodeAt(w.length - 1);
              M = f.charCodeAt(0);
              q = '';
              if (0 !== E)
                switch (n) {
                  case 42:
                  case 126:
                  case 62:
                  case 43:
                  case 32:
                  case 40:
                    break;
                  default:
                    q = ' ';
                }
              switch (M) {
                case 38:
                  f = q + L;
                case 126:
                case 62:
                case 43:
                case 32:
                case 41:
                case 40:
                  break;
                case 91:
                  f = q + f + L;
                  break;
                case 58:
                  switch (2 * f.charCodeAt(1) + 3 * f.charCodeAt(2)) {
                    case 530:
                      if (0 < Z) {
                        f = q + f.substring(8, z - 1);
                        break;
                      }
                    default:
                      if (1 > E || 1 > v[E - 1].length) f = q + L + f;
                  }
                  break;
                case 44:
                  q = '';
                default:
                  f = 1 < z && 0 < f.indexOf(':') ? q + f.replace(va, '$1' + L + '$2') : q + f + L;
              }
              w += f;
            }
          c[b] = w.replace(Q, '').trim();
        }
        d = c;
      }
      t = d;
      if (0 < G && ((I = P(2, u, t, e, J, C, r, l, a, l)), void 0 !== I && 0 === (u = I).length))
        return N + u + H;
      u = t.join(',') + '{' + u + '}';
      if (0 !== x * K) {
        2 !== x || U(u, 2) || (K = 0);
        switch (K) {
          case 111:
            u = u.replace(wa, ':-moz-$1') + u;
            break;
          case 112:
            u =
              u.replace(aa, '::-webkit-input-$1') +
              u.replace(aa, '::-moz-$1') +
              u.replace(aa, ':-ms-input-$1') +
              u;
        }
        K = 0;
      }
    }
    return N + u + H;
  }
  function ia(e, d, b) {
    var l = d.trim().split(xa);
    d = l;
    var a = l.length,
      g = e.length;
    switch (g) {
      case 0:
      case 1:
        var c = 0;
        for (e = 0 === g ? '' : e[0] + ' '; c < a; ++c) d[c] = la(e, d[c], b, g).trim();
        break;
      default:
        var q = (c = 0);
        for (d = []; c < a; ++c)
          for (var f = 0; f < g; ++f) d[q++] = la(e[f] + ' ', l[c], b, g).trim();
    }
    return d;
  }
  function la(e, d, b, l) {
    var a = d.charCodeAt(0);
    33 > a && (a = (d = d.trim()).charCodeAt(0));
    switch (a) {
      case 38:
        switch (D + l) {
          case 0:
          case 1:
            if (0 === e.trim().length) break;
          default:
            return d.replace(H, '$1' + e.trim());
        }
        break;
      case 58:
        switch (d.charCodeAt(1)) {
          case 103:
            if (0 < Z && 0 < D) return d.replace(ya, '$1').replace(H, '$1' + S);
            break;
          default:
            return e.trim() + d.replace(H, '$1' + e.trim());
        }
      default:
        if (0 < b * D && 0 < d.indexOf('\f'))
          return d.replace(H, (58 === e.charCodeAt(0) ? '' : '$1') + e.trim());
    }
    return e + d;
  }
  function Y(e, d, b, l) {
    var a = e + ';',
      g = 2 * d + 3 * b + 4 * l;
    if (944 === g) {
      e = a.length;
      var c = a.indexOf(':', 9) + 1;
      d = a.substring(0, c).trim();
      b = a.substring(c, e - 1).trim();
      switch (a.charCodeAt(9) * R) {
        case 0:
          break;
        case 45:
          if (110 !== a.charCodeAt(10)) break;
        default:
          for (a = b.split(((b = ''), za)), c = l = 0, e = a.length; l < e; c = 0, ++l) {
            g = a[l];
            for (var q = g.split(Aa); (g = q[c]); ) {
              var f = g.charCodeAt(0);
              if (
                1 === R &&
                ((64 < f && 90 > f) ||
                  (96 < f && 123 > f) ||
                  95 === f ||
                  (45 === f && 45 !== g.charCodeAt(1)))
              )
                switch (isNaN(parseFloat(g)) + (-1 !== g.indexOf('('))) {
                  case 1:
                    switch (g) {
                      case 'infinite':
                      case 'alternate':
                      case 'backwards':
                      case 'running':
                      case 'normal':
                      case 'forwards':
                      case 'both':
                      case 'none':
                      case 'linear':
                      case 'ease':
                      case 'ease-in':
                      case 'ease-out':
                      case 'ease-in-out':
                      case 'paused':
                      case 'reverse':
                      case 'alternate-reverse':
                      case 'inherit':
                      case 'initial':
                      case 'unset':
                      case 'step-start':
                      case 'step-end':
                        break;
                      default:
                        g += T;
                    }
                }
              q[c++] = g;
            }
            b += (0 === l ? '' : ',') + q.join(' ');
          }
      }
      b = d + b + ';';
      return 1 === x || (2 === x && U(b, 1)) ? '-webkit-' + b + b : b;
    }
    if (0 === x || (2 === x && !U(a, 1))) return a;
    switch (g) {
      case 1015:
        return 97 === a.charCodeAt(10) ? '-webkit-' + a + a : a;
      case 951:
        return 116 === a.charCodeAt(3) ? '-webkit-' + a + a : a;
      case 963:
        return 110 === a.charCodeAt(5) ? '-webkit-' + a + a : a;
      case 1009:
        if (100 !== a.charCodeAt(4)) break;
      case 969:
      case 942:
        return '-webkit-' + a + a;
      case 978:
        return '-webkit-' + a + '-moz-' + a + a;
      case 1019:
      case 983:
        return '-webkit-' + a + '-moz-' + a + '-ms-' + a + a;
      case 883:
        if (45 === a.charCodeAt(8)) return '-webkit-' + a + a;
        if (0 < a.indexOf('image-set(', 11)) return a.replace(Ba, '$1-webkit-$2') + a;
        break;
      case 932:
        if (45 === a.charCodeAt(4))
          switch (a.charCodeAt(5)) {
            case 103:
              return (
                '-webkit-box-' +
                a.replace('-grow', '') +
                '-webkit-' +
                a +
                '-ms-' +
                a.replace('grow', 'positive') +
                a
              );
            case 115:
              return '-webkit-' + a + '-ms-' + a.replace('shrink', 'negative') + a;
            case 98:
              return '-webkit-' + a + '-ms-' + a.replace('basis', 'preferred-size') + a;
          }
        return '-webkit-' + a + '-ms-' + a + a;
      case 964:
        return '-webkit-' + a + '-ms-flex-' + a + a;
      case 1023:
        if (99 !== a.charCodeAt(8)) break;
        c = a
          .substring(a.indexOf(':', 15))
          .replace('flex-', '')
          .replace('space-between', 'justify');
        return '-webkit-box-pack' + c + '-webkit-' + a + '-ms-flex-pack' + c + a;
      case 1005:
        return Ca.test(a) ? a.replace(ma, ':-webkit-') + a.replace(ma, ':-moz-') + a : a;
      case 1e3:
        c = a.substring(13).trim();
        d = c.indexOf('-') + 1;
        switch (c.charCodeAt(0) + c.charCodeAt(d)) {
          case 226:
            c = a.replace(N, 'tb');
            break;
          case 232:
            c = a.replace(N, 'tb-rl');
            break;
          case 220:
            c = a.replace(N, 'lr');
            break;
          default:
            return a;
        }
        return '-webkit-' + a + '-ms-' + c + a;
      case 1017:
        if (-1 === a.indexOf('sticky', 9)) break;
      case 975:
        d = (a = e).length - 10;
        c = (33 === a.charCodeAt(d) ? a.substring(0, d) : a)
          .substring(e.indexOf(':', 7) + 1)
          .trim();
        switch ((g = c.charCodeAt(0) + (c.charCodeAt(7) | 0))) {
          case 203:
            if (111 > c.charCodeAt(8)) break;
          case 115:
            a = a.replace(c, '-webkit-' + c) + ';' + a;
            break;
          case 207:
          case 102:
            a =
              a.replace(c, '-webkit-' + (102 < g ? 'inline-' : '') + 'box') +
              ';' +
              a.replace(c, '-webkit-' + c) +
              ';' +
              a.replace(c, '-ms-' + c + 'box') +
              ';' +
              a;
        }
        return a + ';';
      case 938:
        if (45 === a.charCodeAt(5))
          switch (a.charCodeAt(6)) {
            case 105:
              return (
                (c = a.replace('-items', '')),
                '-webkit-' + a + '-webkit-box-' + c + '-ms-flex-' + c + a
              );
            case 115:
              return '-webkit-' + a + '-ms-flex-item-' + a.replace(na, '') + a;
            default:
              return (
                '-webkit-' +
                a +
                '-ms-flex-line-pack' +
                a.replace('align-content', '').replace(na, '') +
                a
              );
          }
        break;
      case 973:
      case 989:
        if (45 !== a.charCodeAt(3) || 122 === a.charCodeAt(4)) break;
      case 931:
      case 953:
        if (!0 === Da.test(e))
          return 115 === (c = e.substring(e.indexOf(':') + 1)).charCodeAt(0)
            ? Y(e.replace('stretch', 'fill-available'), d, b, l).replace(
                ':fill-available',
                ':stretch'
              )
            : a.replace(c, '-webkit-' + c) + a.replace(c, '-moz-' + c.replace('fill-', '')) + a;
        break;
      case 962:
        if (
          ((a = '-webkit-' + a + (102 === a.charCodeAt(5) ? '-ms-' + a : '') + a),
          211 === b + l && 105 === a.charCodeAt(13) && 0 < a.indexOf('transform', 10))
        )
          return a.substring(0, a.indexOf(';', 27) + 1).replace(Ea, '$1-webkit-$2') + a;
    }
    return a;
  }
  function U(e, d) {
    var b = e.indexOf(1 === d ? ':' : '{'),
      l = e.substring(0, 3 !== d ? b : 10);
    b = e.substring(b + 1, e.length - 1);
    return ba(2 !== d ? l : l.replace(Fa, '$1'), b, d);
  }
  function sa(e, d) {
    var b = Y(d, d.charCodeAt(0), d.charCodeAt(1), d.charCodeAt(2));
    return b !== d + ';' ? b.replace(Ga, ' or ($1)').substring(4) : '(' + d + ')';
  }
  function P(e, d, b, l, a, g, c, q, f, p) {
    for (var h = 0, v = d, w; h < G; ++h)
      switch ((w = ca[h].call(y, e, v, b, l, a, g, c, q, f, p))) {
        case void 0:
        case !1:
        case !0:
        case null:
          break;
        default:
          v = w;
      }
    if (v !== d) return v;
  }
  function da(e) {
    switch (e) {
      case void 0:
      case null:
        G = ca.length = 0;
        break;
      default:
        switch (e.constructor) {
          case Array:
            for (var d = 0, b = e.length; d < b; ++d) da(e[d]);
            break;
          case Function:
            ca[G++] = e;
            break;
          case Boolean:
            ka = !!e | 0;
        }
    }
    return da;
  }
  function ea(e) {
    for (var d in e) {
      var b = e[d];
      switch (d) {
        case 'keyframe':
          R = b | 0;
          break;
        case 'global':
          Z = b | 0;
          break;
        case 'cascade':
          D = b | 0;
          break;
        case 'compress':
          oa = b | 0;
          break;
        case 'semicolon':
          ja = b | 0;
          break;
        case 'preserve':
          X = b | 0;
          break;
        case 'prefix':
          (ba = null), b ? ('function' !== typeof b ? (x = 1) : ((x = 2), (ba = b))) : (x = 0);
      }
    }
    return ea;
  }
  function y(e, d) {
    if (void 0 !== this && this.constructor === y) return fa(e);
    var b = e,
      l = b.charCodeAt(0);
    33 > l && (l = (b = b.trim()).charCodeAt(0));
    0 < R && (T = b.replace(Ha, 91 === l ? '' : '-'));
    l = 1;
    1 === D ? (S = b) : (L = b);
    b = [S];
    if (0 < G) {
      var a = P(-1, d, b, b, J, C, 0, 0, 0, 0);
      void 0 !== a && 'string' === typeof a && (d = a);
    }
    var g = V(W, b, d, 0, 0);
    0 < G &&
      ((a = P(-2, g, b, b, J, C, g.length, 0, 0, 0)),
      void 0 !== a && 'string' !== typeof (g = a) && (l = 0));
    L = S = T = '';
    K = 0;
    C = J = 1;
    return 0 === oa * l
      ? g
      : g
          .replace(Q, '')
          .replace(Ia, '')
          .replace(Ja, '$1')
          .replace(Ka, '$1')
          .replace(La, ' ');
  }
  var qa = /^\0+/g,
    Q = /[\0\r\f]/g,
    ma = /: */g,
    Ca = /zoo|gra/,
    Ea = /([,: ])(transform)/g,
    za = /,+\s*(?![^(]*[)])/g,
    Aa = / +\s*(?![^(]*[)])/g,
    ua = / *[\0] */g,
    xa = /,\r+?/g,
    H = /([\t\r\n ])*\f?&/g,
    ya = /:global\(((?:[^\(\)\[\]]*|\[.*\]|\([^\(\)]*\))*)\)/g,
    Ha = /\W+/g,
    ta = /@(k\w+)\s*(\S*)\s*/,
    aa = /::(place)/g,
    wa = /:(read-only)/g,
    Ia = /\s+(?=[{\];=:>])/g,
    Ja = /([[}=:>])\s+/g,
    Ka = /(\{[^{]+?);(?=\})/g,
    La = /\s{2,}/g,
    va = /([^\(])(:+) */g,
    N = /[svh]\w+-[tblr]{2}/,
    ra = /\(\s*(.*)\s*\)/g,
    Ga = /([\s\S]*?);/g,
    na = /-self|flex-/g,
    Fa = /[^]*?(:[rp][el]a[\w-]+)[^]*/,
    Da = /stretch|:\s*\w+\-(?:conte|avail)/,
    Ba = /([^-])(image-set\()/,
    C = 1,
    J = 1,
    K = 0,
    D = 1,
    x = 1,
    Z = 1,
    oa = 0,
    ja = 0,
    X = 0,
    W = [],
    ca = [],
    G = 0,
    ba = null,
    ka = 0,
    R = 1,
    T = '',
    L = '',
    S = '';
  y.use = da;
  y.set = ea;
  void 0 !== ha && ea(ha);
  return y;
};

export default pa(null);
