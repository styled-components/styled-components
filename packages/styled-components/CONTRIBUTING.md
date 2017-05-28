Thanks for giving this a read! We're always open to your contributions to styled-components.
This document will get you started on how to contribute and things you should know.
So please give it a thorough read.

Please also give the code of conduct a read.

## How do I contribute code?

1. Find some issue you're interested in, or a feature that you'd like to tackle.
  Also make sure that no one else is already working on it. We don't want you to be
  disappointed.

2. Fork, then clone: `git clone httpsL://github.com/YOUR_USERNAME/styled-components.git`

3. Create a branch with a meaningful name for the issue: `git checkout -b fix-something`

4. Make your changes and commit: `git add` and `git commit`

5. Make sure that the tests still pass: `npm test` and `npm run flow` (for the type checks)

6. Push your branch: `git push -u origin your-branch-name`

7. Submit a pull request to the upstream styled-components repository.

8. Choose a descriptive title and describe your changes briefly.

9. Wait for a maintainer to review your PR, make changes if it's being recommended, and get it merged.

10. Perform a celebratory dance! :dancer:

## How do I set up the project?

Run `npm install` and edit code in the `src/` folder. It's luckily very simple! :wink:

When you commit our pre-commit hook will run, which executes `lint-staged`. It will run
the linter automatically and warn you, if the code you've written doesn't comply with our
code style.

