'use client'

import { TemplatesScreen } from '@/components/documents/TemplatesScreen'
import { demoReadOnly } from '../../readOnly'

/**
 * The demo twin. Every card is a no-op with the same explanation every other
 * demo write gets -- there is no account to create a CV in.
 */
export default function Page() {
  return <TemplatesScreen onChoose={demoReadOnly} onChooseBlank={demoReadOnly} />
}
