interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * FMI MCP — Finnish Meteorological Institute open WFS.
 *
 * Auth: none. Docs: https://en.ilmatieteenlaitos.fi/open-data-manual-api-access
 * The endpoint returns GML/XML — this pack parses out the typical fields.
 */


const BASE = 'https://opendata.fmi.fi/wfs';
const UA = 'pipeworx-mcp-fmi/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'forecast',
    description: 'Multi-hour HARMONIE forecast for a place name in Finland (60 h ahead).',
    inputSchema: {
      type: 'object',
      properties: {
        place: { type: 'string', description: 'e.g. "Helsinki"' },
        parameters: { type: 'string', description: 'Comma-sep, e.g. "temperature,humidity,windspeedms". Default common set.' },
        timestep: { type: 'number', description: 'Minutes (default 60).' },
      },
      required: ['place'],
    },
  },
  {
    name: 'latest_observations',
    description: 'Most recent observation values for a place.',
    inputSchema: {
      type: 'object',
      properties: {
        place: { type: 'string' },
        parameters: { type: 'string' },
      },
      required: ['place'],
    },
  },
  {
    name: 'recent_observations',
    description: 'Last N hours of observations.',
    inputSchema: {
      type: 'object',
      properties: {
        place: { type: 'string' },
        parameters: { type: 'string' },
        hours: { type: 'number', description: '1-48 (default 6)' },
      },
      required: ['place'],
    },
  },
  {
    name: 'warnings',
    description: 'Currently active weather warnings (Finland, ISO bulletin XML returned as text).',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'forecast': {
      const params = new URLSearchParams({
        request: 'getFeature',
        storedquery_id: 'fmi::forecast::harmonie::surface::point::simple',
        place: reqStr(args, 'place', '"Helsinki"'),
        timestep: String(Math.max(1, (args.timestep as number) ?? 60)),
      });
      if (args.parameters) params.set('parameters', String(args.parameters));
      return parseSimplePoints(await wfsGet(`?${params}`));
    }
    case 'latest_observations': {
      const params = new URLSearchParams({
        request: 'getFeature',
        storedquery_id: 'fmi::observations::weather::simple',
        place: reqStr(args, 'place', '"Helsinki"'),
      });
      if (args.parameters) params.set('parameters', String(args.parameters));
      const xml = await wfsGet(`?${params}`);
      const all = parseSimplePoints(xml);
      // Take only the latest timestamp per parameter
      const byParam = new Map<string, { time: string; value: string }>();
      for (const r of all.observations) {
        const prev = byParam.get(r.parameter);
        if (!prev || r.time > prev.time) byParam.set(r.parameter, { time: r.time, value: r.value });
      }
      return { place: reqStr(args, 'place', '"Helsinki"'), latest: Object.fromEntries(byParam) };
    }
    case 'recent_observations': {
      const hours = Math.min(48, Math.max(1, (args.hours as number) ?? 6));
      const starttime = new Date(Date.now() - hours * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
      const params = new URLSearchParams({
        request: 'getFeature',
        storedquery_id: 'fmi::observations::weather::simple',
        place: reqStr(args, 'place', '"Helsinki"'),
        starttime,
      });
      if (args.parameters) params.set('parameters', String(args.parameters));
      return parseSimplePoints(await wfsGet(`?${params}`));
    }
    case 'warnings': {
      const params = new URLSearchParams({
        request: 'getFeature',
        storedquery_id: 'fmi::warnings::finland',
      });
      const xml = await wfsGet(`?${params}`);
      return { format: 'xml', body: xml };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function wfsGet(qs: string): Promise<string> {
  const res = await fetch(`${BASE}${qs}`, { headers: { Accept: 'application/xml', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`FMI: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.text();
}

/**
 * Parse the simple stored-query feature shape:
 *   <BsWfs:BsWfsElement>
 *     <BsWfs:Location><gml:Point><gml:pos>lat lon</gml:pos>...
 *     <BsWfs:Time>2026-05-15T17:00:00Z</BsWfs:Time>
 *     <BsWfs:ParameterName>temperature</BsWfs:ParameterName>
 *     <BsWfs:ParameterValue>15.2</BsWfs:ParameterValue>
 *   </BsWfs:BsWfsElement>
 */
function parseSimplePoints(xml: string): { observations: { lat: number; lon: number; time: string; parameter: string; value: string }[] } {
  const items: { lat: number; lon: number; time: string; parameter: string; value: string }[] = [];
  const elementRe = /<BsWfs:BsWfsElement[^>]*>([\s\S]*?)<\/BsWfs:BsWfsElement>/g;
  let m: RegExpExecArray | null;
  while ((m = elementRe.exec(xml)) !== null) {
    const body = m[1];
    const pos = /<gml:pos[^>]*>([^<]+)<\/gml:pos>/.exec(body);
    const time = /<BsWfs:Time>([^<]+)<\/BsWfs:Time>/.exec(body);
    const param = /<BsWfs:ParameterName>([^<]+)<\/BsWfs:ParameterName>/.exec(body);
    const value = /<BsWfs:ParameterValue>([^<]+)<\/BsWfs:ParameterValue>/.exec(body);
    if (!pos || !time || !param || !value) continue;
    const [lat, lon] = pos[1].trim().split(/\s+/).map(Number);
    items.push({ lat, lon, time: time[1], parameter: param[1], value: value[1] });
  }
  return { observations: items };
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
