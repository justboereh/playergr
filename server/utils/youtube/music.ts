import { BASEURL, API_KEY, CLIENT_VERSION, PARAMS_ID } from './constants'
import type { MusicSearchResult, Song } from 'assets/types/youtube'

export type SerachYoutubeMusicOptions = {
  query: string
  type?: 'song'
  continuation?: string
}

export async function useSearchYoutubeMusic({ query, continuation }: SerachYoutubeMusicOptions) {
  try {
    const result = await $fetch<string>(`${BASEURL}/youtubei/v1/search`, {
      headers: {
        'X-Youtube-Client-Version': '1.20240522.01.00',
        'X-Youtube-Client-Name': '67',
        'Content-Type': ' application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        Origin: ' https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      method: 'POST',
      params: {
        key: API_KEY,
        prettyPrint: 'false',
        params: !continuation && PARAMS_ID,
        type: !continuation ? undefined : 'next',
        continuation,
      },
      body: {
        query: !continuation ? query : undefined,
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: CLIENT_VERSION,
            youtubeClientOptions: {
              hl: 'en',
              gl: 'US',
            },
          },
        },
      },
    })

    return extractData(result)
  } catch (er) {
    console.log(er)

    return { songs: [] }
  }
}

function extractData(data: any): MusicSearchResult {
  // ignore this... data is extremely nested
  const shelf_renderer = data.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer
  const continuation: string = shelf_renderer.continuations[0].nextContinuationData.continuation
  const songs: Song[] = []

  for (const content of shelf_renderer.contents) {
    const flexColumns = content.musicResponsiveListItemRenderer.flexColumns
    const name = flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
    const id = flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
    const artists: Array<{ id: string; name: string }> = []
    const album = { id: '', name: '' }
    const thumbnails: Array<{ url: string; width: number; height: number }> =
      content.musicResponsiveListItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails

    for (const run of flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs) {
      if (!run.navigationEndpoint) continue

      const type = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType

      switch (type) {
        case 'MUSIC_PAGE_TYPE_ARTIST':
          artists.push({
            name: run.text,
            id: run.navigationEndpoint.browseEndpoint.browseId,
          })
          break
        case 'MUSIC_PAGE_TYPE_ALBUM':
          album.id = run.text
          album.name = run.navigationEndpoint.browseEndpoint.browseId
          break
      }
    }

    songs.push({
      name,
      id,
      thumbnails,
      album,
      artists,
    })
  }

  return {
    songs,
    continuation,
  }
}
