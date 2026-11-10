// CA gate. Both branches are live from day one.
// Never blanket-reject 0x hex: any well-formed EVM address is accepted, in any letter case.
const EVM = /^0x[0-9a-fA-F]{40}$/;

export function gateCA(rec) {
  if (!rec || rec.state === 'absent' || !rec.value) return { state: 'absent', address: null };
  if (rec.state === 'stated' && EVM.test(rec.value)) return { state: 'stated', address: rec.value };
  // stated but malformed, or explicitly unconfirmed: unusable, never a crash
  return { state: 'unconfirmed', address: null };
}
export const sameAddress = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
