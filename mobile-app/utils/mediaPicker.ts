import * as ImagePicker from 'expo-image-picker'

/**
 * Thin adapter exposing the `react-native-image-picker` API surface
 * (`launchImageLibrary` / `launchCamera` returning `{ didCancel, assets }`)
 * on top of `expo-image-picker`, so the ported screens keep their call sites.
 */

type LegacyOptions = {
  mediaType?: string
  quality?: number
  includeBase64?: boolean
  selectionLimit?: number
  [key: string]: any
}

type LegacyAsset = {
  uri?: string
  base64?: string
  fileName?: string
  type?: string
  fileSize?: number
  width?: number
  height?: number
}

type LegacyResponse = {
  didCancel: boolean
  errorCode?: string
  errorMessage?: string
  assets: LegacyAsset[]
}

function toResponse(res: ImagePicker.ImagePickerResult): LegacyResponse {
  if (res.canceled || !res.assets) return { didCancel: true, assets: [] }
  return {
    didCancel: false,
    assets: res.assets.map((a) => ({
      uri: a.uri,
      base64: a.base64 ?? undefined,
      fileName: a.fileName ?? undefined,
      type: a.mimeType ?? undefined,
      fileSize: a.fileSize ?? undefined,
      width: a.width,
      height: a.height,
    })),
  }
}

export async function launchImageLibrary(opts: LegacyOptions = {}): Promise<LegacyResponse> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return { didCancel: true, assets: [] }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: opts.quality ?? 0.8,
    base64: opts.includeBase64 ?? false,
    selectionLimit: opts.selectionLimit ?? 1,
  })
  return toResponse(res)
}

export async function launchCamera(opts: LegacyOptions = {}): Promise<LegacyResponse> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return { didCancel: true, assets: [] }
  const res = await ImagePicker.launchCameraAsync({
    quality: opts.quality ?? 0.8,
    base64: opts.includeBase64 ?? false,
  })
  return toResponse(res)
}
