/**
 * Spanish — the app's first language, in rioplatense voseo. This dictionary is
 * the source of truth for the shape of every other one: `src/i18n/en.ts` is
 * typed against it, so a missing key there is a type error.
 */
export const es = {
  app: {
    name: 'Siete Luces',
    tagline: 'Tablero de visión',
  },
  column: {
    subtitle: 'De la raíz a la corona. Un centro por vez, cuando tengas ganas.',
    center: 'Centro {n}',
    /** Read out by screen readers for a row in the column. */
    rowLabel: '{name}, centro {n}',
  },
  board: {
    back: '← Columna',
    missing: 'Ese centro no existe.',
    backToColumn: '← Volver a la columna',
    silence: 'silencio',
    intention: 'Intención',
    affirmation: 'Afirmación',
    affirmationPlaceholder: 'Yo…',
    words: 'Palabras',
    wordPlaceholder: 'una palabra',
    addWord: '+ palabra',
    removeWordHint: '{word}. Mantené apretado para quitar.',
    images: 'Imágenes',
    addFirstImage: 'sumar la primera',
    addImage: 'sumar imagen',
    preparing: 'preparando…',
    downloading: 'Descargando…',
    hint: 'Se guarda solo. Mantené apretada una imagen para quitarla.',
  },
  photos: {
    sourceTitle: 'Sumar imagen',
    fromLibrary: 'Elegir de la galería',
    fromCamera: 'Sacar una foto',
    cancel: 'Cancelar',
    removeTitle: 'Quitar esta imagen',
    removeBody: 'Sale del tablero en todos tus dispositivos.',
    remove: 'Quitar',
    alertTitle: 'Imágenes',
  },
  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    languageHint: 'Cambia toda la app, al toque.',
    sync: 'Sincronización',
    session: 'Sesión',
    state: 'Estado',
    syncNow: 'Sincronizar ahora',
    signOut: 'Cerrar sesión',
    signIn: 'Continuar con Google',
    signInHint: 'Entrá con tu cuenta de Google y los tableros te siguen a cualquier dispositivo.',
    lastSynced: 'Última vez: {when}',
    neverSynced: 'Sin sincronizar todavía',
    notConfiguredTitle: 'Solo en este teléfono',
    notConfiguredBody:
      'Los tableros viven solo en este teléfono. Para verlos también en la web hay que conectar Supabase: copiá .env.example a .env.local, poné la URL y la anon key del proyecto, y corré el SQL de supabase/schema.sql.',
    notConfiguredMore: 'Los pasos completos están en el README.',
  },
  sync: {
    syncing: 'Sincronizando…',
    synced: 'Sincronizado',
    error: 'Error al sincronizar',
    signedOut: 'Entrar para sincronizar',
    local: 'Solo en este teléfono',
  },
  errors: {
    unknown: 'Algo falló. Probá de nuevo.',
    'sync-not-configured': 'La sincronización todavía no está configurada.',
    'sync-failed': 'No se pudo sincronizar.',
    'sign-in-failed': 'No se pudo entrar con Google. Probá de nuevo.',
    'photo-permission': 'Siete Luces necesita permiso para ver tus fotos. Se cambia en Ajustes.',
    'photo-failed': 'No se pudo agregar la imagen.',
  },
  /** Per-chakra copy lives with the chakras themselves; see src/data/chakras.ts. */
};

export type Dictionary = typeof es;
