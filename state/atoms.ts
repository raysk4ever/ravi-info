import { Message } from '@/components/Raggy'
import {atomWithStorage} from 'jotai/utils'

export const messagesAtom = atomWithStorage<Message[]>('raggy-messages', [])

