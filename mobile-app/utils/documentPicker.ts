import * as DocumentPicker from 'expo-document-picker'

/**
 * Adapter exposing the slice of `@react-native-documents/picker` the screens
 * use (`pick`, `keepLocalCopy`, `types`, `errorCodes`, `isErrorWithCode`) on
 * top of `expo-document-picker`. expo already copies picked files into the
 * cache directory, so `keepLocalCopy` is effectively a pass-through.
 */

export const types = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  plainText: 'text/plain',
  images: 'image/*',
  allFiles: '*/*',
}

export const errorCodes = {
  OPERATION_CANCELED: 'OPERATION_CANCELED',
} as const

export function isErrorWithCode(e: any): e is { code: string } {
  return Boolean(e) && typeof e.code === 'string'
}

export type PickedDocument = {
  uri: string
  name: string
  type: string | null
  size: number | null
}

export async function pick(
  opts: { type?: string | string[]; allowMultiSelection?: boolean; [key: string]: any } = {},
): Promise<PickedDocument[]> {
  const res = await DocumentPicker.getDocumentAsync({
    type: opts.type ?? '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  })
  if (res.canceled || !res.assets?.length) {
    const err: any = new Error('User canceled document picker')
    err.code = errorCodes.OPERATION_CANCELED
    throw err
  }
  return res.assets.map((a) => ({
    uri: a.uri,
    name: a.name,
    type: a.mimeType ?? null,
    size: a.size ?? null,
  }))
}

type KeepLocalCopyArgs = {
  files: { uri: string; fileName: string }[]
  destination?: string
}

export async function keepLocalCopy(
  args: KeepLocalCopyArgs,
): Promise<{ status: 'success'; localUri: string; copyError?: string }[]> {
  // expo-document-picker already returns a cached local URI, so the file is
  // already available locally — surface it unchanged.
  return args.files.map((f) => ({ status: 'success', localUri: f.uri }))
}
