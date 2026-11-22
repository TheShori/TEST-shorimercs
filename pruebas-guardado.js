import { encryptPassword, decryptPassword, legacyPasswordPatch, RETIRED_PASSWORD } from './legacy-credentials.js?v=save-v1';

export function runChecks() {
  const checks = [];
  const check = (name, fn) => {
    try { if (fn() !== true) throw new Error(); checks.push({ name, ok: true }); }
    catch { checks.push({ name, ok: false }); }
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fails = fn => { try { fn(); return false; } catch { return true; } };
  const plain = 'FICTICIA ñ 🔐 con espacios % +';
  const encoded = encryptPassword(plain);
  const mission = { status: 'En Pausa', accountPass: encoded };
  check('Recupera el formato antiguo correcto', () => decryptPassword(encoded) === plain);
  check('Conserva espacios al principio y al final', () => decryptPassword(encryptPassword('  FICTICIA  ')) === '  FICTICIA  ');
  check('Conserva simbolos y saltos de linea ficticios', () => decryptPassword(encryptPassword('FICTICIA"\\\n')) === 'FICTICIA"\\\n');
  check('Solo elimina el sufijo final del formato', () => {
    const p = 'FICTICIA_GestionMercenariosSecureKey2026!_INTERIOR';
    return decryptPassword(encryptPassword(p)) === p;
  });
  check('No interpreta texto desconocido como formato antiguo', () => decryptPassword('FICTICIA-SIN-FORMATO') === 'FICTICIA-SIN-FORMATO');
  check('No interpreta cualquier base64 como una contraseña codificada', () => {
    const p = btoa('FICTICIA-OTRO-FORMATO'); return decryptPassword(p) === p;
  });
  check('Rechaza una codificacion no canonica', () => decryptPassword(encoded + '\n') === encoded + '\n');
  check('No modifica el marcador de retirada al mostrarlo', () => decryptPassword(RETIRED_PASSWORD) === RETIRED_PASSWORD);
  check('Una edicion sin cambiar contraseña no la incluye en la escritura', () => same(legacyPasswordPatch(plain, mission), {}));
  check('Cien guardados sin cambio no acumulan capas', () => {
    let stored = encoded;
    for (let i = 0; i < 100; i++) {
      const patch = legacyPasswordPatch(decryptPassword(stored), { status: 'En Pausa', accountPass: stored });
      if (Object.hasOwn(patch, 'accountPass')) stored = patch.accountPass;
    }
    return stored === encoded;
  });
  check('Una contraseña nueva se codifica una sola vez', () => {
    const patch = legacyPasswordPatch('FICTICIA-NUEVA', mission);
    return patch.accountPass === encryptPassword('FICTICIA-NUEVA') && decryptPassword(patch.accountPass) === 'FICTICIA-NUEVA';
  });
  check('Una alta usa el formato compatible', () => same(legacyPasswordPatch(plain), { accountPass: encoded }));
  check('Un campo ausente no se introduce por editar otros datos', () => same(legacyPasswordPatch('', { status: 'En Pausa' }), {}));
  check('Un campo nulo no se transforma por editar otros datos', () => same(legacyPasswordPatch('', { status: 'En Pausa', accountPass: null }), {}));
  check('Una contraseña vacia sin cambios no se reescribe', () => same(legacyPasswordPatch('', { status: 'En Pausa', accountPass: '' }), {}));
  check('Vaciar expresamente una contraseña produce un campo vacio', () => same(legacyPasswordPatch('', mission), { accountPass: '' }));
  check('El marcador retirado no se vuelve a codificar', () => same(legacyPasswordPatch(RETIRED_PASSWORD, { status: 'En Pausa', accountPass: RETIRED_PASSWORD }), {}));
  check('No admite el marcador como contraseña de una alta', () => fails(() => legacyPasswordPatch(RETIRED_PASSWORD)));
  check('Una mision completada permite conservar su dato anterior', () => same(legacyPasswordPatch(plain, { ...mission, status: 'Completada' }), {}));
  check('Una mision completada rechaza sustituir la contraseña', () => fails(() => legacyPasswordPatch('FICTICIA-NUEVA', { ...mission, status: 'Completada' })));
  check('Una contraseña con varias capas no se descifra recursivamente', () => decryptPassword(encryptPassword(encoded)) === encoded);
  check('Un dato con varias capas sin cambios se conserva exactamente', () => same(legacyPasswordPatch(encoded, { ...mission, accountPass: encryptPassword(encoded) }), {}));
  check('Un dato antiguo desconocido sin cambios se conserva', () => same(legacyPasswordPatch('FICTICIA-ANTIGUA', { ...mission, accountPass: 'FICTICIA-ANTIGUA' }), {}));
  check('Un error de codificacion bloquea el guardado sin devolver texto plano', () => fails(() => legacyPasswordPatch('\uD800', mission)));
  check('Una entrada que no es texto se rechaza', () => fails(() => legacyPasswordPatch({ password: 'FICTICIA' }, mission)));
  return checks;
}
