// @flow
import Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-15'

// Configure Enzyme for React 15.x
Enzyme.configure({ adapter: new Adapter() })
