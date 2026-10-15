/** Button labels: both LINE quick reply and Messenger cap at 20 characters. */
export const clipLabel = (s: string, max = 20) => {
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max - 1).join('') + '…';
};
