import { notFound } from 'next/navigation';
import { E2ERoot } from './root';

export default function E2EPage() {
  if (process.env.E2E_TEST_MODE !== '1') {
    notFound();
  }
  return <E2ERoot />;
}
