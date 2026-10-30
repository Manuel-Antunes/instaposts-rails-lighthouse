// The gradient of a post without pictures, picked from its id: always the same one.
export function gradientFor(id: string) {
  const gradients = [
    'from-fuchsia-500 via-rose-500 to-amber-400',
    'from-indigo-500 via-purple-500 to-pink-500',
    'from-sky-500 via-cyan-500 to-emerald-400',
    'from-orange-500 via-red-500 to-rose-600',
    'from-emerald-500 via-teal-500 to-sky-600',
    'from-violet-600 via-indigo-500 to-blue-400',
  ]
  return gradients[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % gradients.length]
}
