// Connexion par identifiant (nom) plutot que par email : on derive un email
// interne unique et stable a partir de lidentifiant saisi. Lutilisateur ne
// voit jamais cet email. Si lentree contient deja un @, on la traite comme
// un email (compatibilite avec les comptes crees avec un vrai email).
export function emailFromLogin(input: string): string {
  const v = (input ?? "").trim();
  if (v.includes("@")) return v.toLowerCase();
  const slug = v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enleve les accents
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${slug || "user"}@etransmed.app`;
}
