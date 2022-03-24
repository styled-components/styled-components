const statement = `
A message from the styled-components core team:

If you are seeing this, your environment is set to Russian locale. By now, it is our hope that you have seen the devastation, horrors, and complete disregard the Russian military has for Ukranian civilians. Our position is that this war is unprovoked, unjust, and a senseless act of genocide and aggression against the Ukranian people.

As of March 24, 2022 the following has been reported (based on the Kyiv Independent @kyivindependent news publication):

87 residential buildings damaged in Kyiv since Feb. 24.

According to the Kyiv City State Administration, Russian attacks have also damaged 10 private houses, 12 schools, and 6 kindergartens in the Ukrainian capital since the beginning of the full-scale invasion.

Russia launched 1,200 missiles on Ukraine.

Half of all Ukrainian children have been displaced since Feb. 24, according to UNICEF.

“Since the start of the war a month ago, out of every boy and girl in the country, one out of two now has had to flee their homes,” UNICEF spokesperson James Elder told CNN.

The Institute of Mass Information reported that one journalist also went missing. Overall, Russia has committed 148 crimes against journalists and media in Ukraine, according to the report.

Mariupol city council: Russian occupiers forcibly move 6,000 Mariupol residents to Russia.

The local authorities in the besieged seaport said on March 24 that Russian occupiers are now forcibly moving more of its residents to Russia, confiscating their Ukrainian passports.

“We’ve seen numerous credible reports of indiscriminate attacks and attacks deliberately targeting civilians, as well as other atrocities,” reads the March 23 statement by U.S. Secretary of State Antony Blinken.

1,143 buildings have been destroyed in Kharkiv since the beginning of the full-scale invasion of Ukraine.

According to Kharkiv Mayor Ihor Terekhov, Russian forces destroyed 1,143 buildings in Ukraine’s second-biggest city, 998 of which are residential buildings.

---

This is a small sampling of the things being reported on the ground in Ukraine. If you are in a position to do something, have connections, or can spread the word, this is the time to do so. Don't let Vladimir Putin permanently stain the souls of all Russian people with these atrocities. He must be removed from power immediately.

---

russian via google translate (sorry, I'm sure it's not perfect):

Сообщение от команды styled-components:

Если вы виде это, ваша среда настроена на русский язык. Мы надеемся, что к настоящему моменту вы видели разруху, ужасы и полное пренебрежение российских военных к гражданскому населению Украины. Наша позиция заключается в том, что эта война является неспровоцированной, несправедливой и бессмысленным актом геноцида и агрессии против украинского народа.

По состоянию на 24 марта 2022 года сообщалось следующее (по материалам новостного издания Kyiv Independent @kyivindependent):

С 24 февраля в Киеве повреждено 87 жилых домов.

По данным Киевской городской государственной администрации, с начала полномасштабного вторжения российские обстрелы также повредили 10 частных домов, 12 школ и 6 детских садов в украинской столице.

Россия запустила 1200 ракет по Украине.

По данным ЮНИСЕФ, половина всех украинских детей были перемещены с 24 февраля.

«С начала войны месяц назад из каждого мальчика и девочки в стране каждый второй был вынужден покинуть свои дома», — сказал CNN представитель ЮНИСЕФ Джеймс Элдер.

Институт массовой информации сообщил, что также пропал один журналист. Всего Россия совершила 148 преступлений против журналистов и СМИ в Украине, говорится в отчете.

Мариупольский горсовет: российские оккупанты насильно переселяют в Россию 6 тысяч мариупольцев.

24 марта местные власти осажденного морского порта заявили, что российские оккупанты сейчас насильственно переселяют в Россию все больше его жителей, отбирая у них украинские паспорта.

«Мы получили многочисленные заслуживающие доверия сообщения о неизбирательных нападениях и нападениях, преднамеренно направленных против гражданских лиц, а также о других зверствах», — говорится в заявлении госсекретаря США Энтони Блинкена от 23 марта.

В Харькове с начала полномасштабного вторжения в Украину разрушено 1143 дома.

По словам мэра Харькова Игоря Терехова, российские войска разрушили 1143 здания во втором по величине городе Украины, 998 из которых являются жилыми домами.

---

Это небольшая выборка того, что сообщается на местах в Украине. Если у вас есть возможность что-то сделать, у вас есть связи или вы можете распространить информацию, сейчас самое время это сделать. Не позволяйте Владимиру Путину навсегда запятнать души всех русских людей этими зверствами. Он должен быть немедленно отстранен от власти.

---

Slava Ukraini 🇺🇦
`;

if (
  Intl.DateTimeFormat()
    .resolvedOptions()
    .locale.startsWith('ru')
) {
  // eslint-disable-next-line
  console.warn(statement);
}
