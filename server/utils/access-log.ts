import type { H3Event } from 'h3'
import type { QueryValue } from 'ufo'
import { parseURL } from 'ufo'
import { UAParser } from 'ua-parser-js'
import {
  Apps,
  Bots,
  CLIs,
  ExtraDevices,
  Emails,
  MediaPlayers,
  Modules,
} from 'ua-parser-js/extensions'
import { parseAcceptLanguage } from 'intl-parse-accept-language'

function toBlobNumber(blob: string) {
  return +blob.replace(/[^\d]/g, '')
}

export const blobsMap = {
  blob1: 'slug',
  blob2: 'url',
  blob3: 'ua',
  blob4: 'ip',
  blob5: 'source',
  blob6: 'country',
  blob7: 'region',
  blob8: 'city',
  blob9: 'timezone',
  blob10: 'language',
  blob11: 'os',
  blob12: 'browser',
  blob13: 'browserType',
  blob14: 'device',
  blob15: 'deviceType',
  blob16: 'UTMSource',
  blob17: 'UTMMedium',
  blob18: 'UTMCampaign',
  blob19: 'UTMTerm',
  blob20: 'UTMContent',
} as const

export type BlobsMap = typeof blobsMap
export type BlobsKey = keyof BlobsMap
export type LogsKey = BlobsMap[BlobsKey]
export type LogsMap = { [key in LogsKey]: string | undefined }

export const logsMap: LogsMap = Object.entries(blobsMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {}) as LogsMap

function logs2blobs(logs: LogsMap) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return Object.keys(blobsMap).sort((a, b) => toBlobNumber(a) - toBlobNumber(b)).map(key => logs[blobsMap[key]] || '')
}

function blobs2logs(blobs: string[]) {
  const logsList = Object.keys(blobsMap)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return blobs.reduce((logs: LogsMap, blob, i) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    logs[blobsMap[logsList[i]]] = blob
    return logs
  }, {})
}

function query2string(query: QueryValue) {
  if (Array.isArray(query)) {
    return query.join(',')
  }
  return query
}

export const useAccessLog = (event: H3Event) => {
  const ip = getHeader(event, 'x-real-ip') || getRequestIP(event, { xForwardedFor: true })

  const referer = getHeader(event, 'referer')
  const { host: source } = parseURL(referer)

  const acceptLanguage = getHeader(event, 'accept-language') || ''
  const language = (parseAcceptLanguage(acceptLanguage) || [])[0]

  const userAgent = getHeader(event, 'user-agent') || ''
  const uaInfo = (new UAParser(userAgent, {
    browser: [Apps.browser || [], Bots.browser || [], CLIs.browser || [], Emails.browser || [], MediaPlayers.browser || [], Modules.browser || []].flat(),
    device: [ExtraDevices.device || []].flat(),
  })).getResult()

  const {
    utm_source: UTMSource,
    utm_medium: UTMMedium,
    utm_campaign: UTMCampaign,
    utm_term: UTMTerm,
    utm_content: UTMContent,
  } = getQuery(event)

  const { request: { cf } } = event.context.cloudflare
  const link = event.context.link || {}

  const accessLogs = {
    url: link.url,
    slug: link.slug,
    ua: userAgent,
    ip,
    source,
    country: cf?.country,
    region: cf?.region,
    city: cf?.city,
    timezone: cf?.timezone,
    language,
    os: uaInfo?.os?.name,
    browser: uaInfo?.browser?.name,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    browserType: uaInfo?.browser?.type,
    device: uaInfo?.device?.model,
    deviceType: uaInfo?.device?.type,
    UTMSource: query2string(UTMSource),
    UTMMedium: query2string(UTMMedium),
    UTMCampaign: query2string(UTMCampaign),
    UTMTerm: query2string(UTMTerm),
    UTMContent: query2string(UTMContent),
  }

  if (process.env.NODE_ENV === 'production') {
    return hubAnalytics().put({
      indexes: [link.id], // only one index
      blobs: logs2blobs(accessLogs),
    })
  }
  else {
    console.log('access logs:', logs2blobs(accessLogs), blobs2logs(logs2blobs(accessLogs)))
    return Promise.resolve()
  }
}
