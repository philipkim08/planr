// Shared by the editor and API so selectable themes are always accepted.
export const themeOptions=[['blue','Blue'],['purple','Purple'],['orange','Orange'],['red','Red'],['green','Green'],['muted','Muted']]
export const isPlanTheme=value=>themeOptions.some(([id])=>id===value)
