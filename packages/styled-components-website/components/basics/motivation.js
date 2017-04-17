import React from 'react'
import SectionLayout from '../SectionLayout'
import Note from '../Note'

const Motivation = () => (
  <SectionLayout title="Motivation">
    <p>
      Styling has become an increasingly complex problem to solve for modern single-page applications.
      Numerous libraries and frameworks have been created to make CSS fit into the component-centric
      world of React apps.
    </p>

    <p>
      The problem with plain CSS is that it was built in an era where the web consisted of documents.
      In 1993 the web was created to exchange mostly scientific documents, and CSS was introduced as
      a solution to style those documents. Nowadays however, we are building rich, interactive,
      user-facing applications, and CSS just isn't built for this use-case.
    </p>

    <p>
      To solve this problem, the main motivation behind Styled Components was: How can we make CSS
      better? And one of the first things that other notable React styling libraries choose to do
      is colocating and isolating styles. This benefits our component-based systems, since the
      styling of one component should never affect another. This isolates a component's styles,
      just like we are isolating its logic and markup.
    </p>

    <p>
      Styled Components takes this concept a step further by completely removing the mapping between
      styles and components. Since a piece of styling will always be associated with a certain DOM
      node in our components via a class, there is no point in having this mapping at all.
      In Styled Components we choose to write components that have some styles attached to them
      directly.
    </p>

    <p>
      This reduces a lot of friction when writing styled applications, and puts a lot more attention
      on the Developer Experience when writing CSS. This attention on your experience when working
      with Styled Components is also the reason behind some other design decisions. Namely, writing
      actual CSS code with ES6 tagged template strings, or built in theming support.
    </p>

    <p>
      The main motivation behind Styled Components is to create a library that fits the mental model
      of writing React applications.
    </p>
  </SectionLayout>
)

export default Motivation
