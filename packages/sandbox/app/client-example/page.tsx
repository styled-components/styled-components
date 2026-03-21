import BackLink from '../components/back-link';
import { ClientTestingHarness } from './testing-harness';
import styled from 'styled-components';

export default function ClientExamplePage() {
  return (
    <PageWrapper>
      <BackLink />
      <ClientTestingHarness />
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
`;
