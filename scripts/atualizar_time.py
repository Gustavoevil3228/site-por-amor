"""Atualiza a página do time a partir de uma pasta de fotos.

Cada foto deve se chamar "Nome - Cargo", por exemplo:

    Gustavo - Gestor Geral.jpg
    Fernanda - Gestora do RH.png
    Nicoly - T.I.jpg

Quem auxilia outro time, sem mudar o cargo, leva esse time entre colchetes no fim.
O que está entre colchetes não aparece no site, só faz a pessoa entrar naquele filtro:

    Vitor - Gestor Geral [T.I].jpg
    Fulano - Marketing [RH, Planejamento].jpg

Para escolher a ordem, coloque um número na frente: "01 - Gustavo - Gestor Geral.jpg".
Sem números, a ordem é por área (instrutora, gestão, RH, marketing...), com
Gestor(a) Geral primeiro e suplentes por último dentro de cada área.

Uso (na pasta do site):
    python scripts/atualizar_time.py              # lê a pasta fotos-time/
    python scripts/atualizar_time.py C:/caminho   # lê outra pasta
    python scripts/atualizar_time.py --opcional   # não dá erro se a pasta estiver vazia

No GitHub, o workflow .github/workflows/site.yml roda este script sozinho a cada
alteração, então basta enviar as fotos para a pasta fotos-time/ pelo site do GitHub.

O script:
  - recorta cada foto em quadrado, reduz e salva em assets/img/time/
  - apaga de assets/img/time/ as fotos de quem não está mais na pasta
  - reescreve data/time.json
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

try:  # fotos de iPhone (.heic), opcional: pip install pillow-heif
    from pillow_heif import register_heif_opener

    register_heif_opener()
    HEIC_OK = True
except ImportError:
    HEIC_OK = False

ROOT = Path(__file__).resolve().parent.parent
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
OPTIONAL = "--opcional" in sys.argv[1:]
SRC = Path(ARGS[0]) if ARGS else ROOT / "fotos-time"
OUT_IMG = ROOT / "assets" / "img" / "time"
OUT_JSON = ROOT / "data" / "time.json"
SIZE = 480
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}

# Palavras do cargo -> área (para os filtros da página). A primeira que bater vale.
# Gestores entram no filtro "Gestão" E no time da área deles ("Gestora de RH" -> RH).
# Gestor(a) Geral, que não tem uma área, fica só em "Gestão".
GESTOR = r"\bgestor|\bgestora|\bdiretor"
AREAS = [
    (r"instrut|orientador", "Instrutora"),
    (r"\brh\b|recursos humanos", "RH"),
    (r"marketing", "Marketing"),
    (r"\bt\.?\s?i\b|tecnologia", "T.I"),
    (r"planejamento", "Planejamento"),
    (r"social", "Desenvolvimento Social"),
    (r"cultural", "Desenvolvimento Cultural"),
    (r"sustent", "Desenvolvimento Sustentável"),
    (r"administ", "Administração"),
    (r"treinamento|estagi", "Em treinamento"),
]
AREA_ORDER = [AREAS[0][1], "Gestão"] + [a for _, a in AREAS[1:]] + ["Outros"]


def area_of(cargo):
    """Devolve (área, é_gestor)."""
    c = cargo.lower()
    gestor = bool(re.search(GESTOR, c))
    for pattern, area in AREAS:
        if re.search(pattern, c):
            return area, gestor
    return ("Gestão" if gestor else "Outros"), gestor


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "pessoa"


def parse_name(stem):
    order = None
    m = re.match(r"^\s*(\d+)\s*[-_.]\s*(.+)$", stem)
    if m:
        order, stem = int(m.group(1)), m.group(2)
    apoio = []
    m = re.search(r"\s*\[([^\]]*)\]\s*$", stem)
    if m:
        apoio = [a.strip() for a in m.group(1).split(",") if a.strip()]
        stem = stem[: m.start()]
    nome, sep, cargo = stem.partition(" - ")
    return order, nome.strip(), cargo.strip(), apoio


def apoio_areas(apoio, area):
    """Times que a pessoa auxilia, com o mesmo nome dos filtros ("T.I", "RH"...)."""
    result = []
    for a in apoio:
        name, _ = area_of(a)
        if name in ("Outros", "Gestão"):
            name = a
        if name != area and name not in result:
            result.append(name)
    return result


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if not SRC.is_dir():
        sys.exit(f"Pasta não encontrada: {SRC}")

    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in EXTS)
    if not HEIC_OK and any(p.suffix.lower() in {".heic", ".heif"} for p in files):
        sys.exit("Há fotos .heic. Rode 'pip install pillow-heif' ou converta para .jpg antes.")
    if not files:
        if OPTIONAL:
            print(f"Nenhuma foto em {SRC}; o time fica como está em data/time.json.")
            return
        sys.exit(f"Nenhuma foto encontrada em {SRC}")

    people = []
    for path in files:
        order, nome, cargo, apoio = parse_name(path.stem)
        if not cargo:
            print(f"  aviso: '{path.name}' está sem cargo (use 'Nome - Cargo')")
        area, gestor = area_of(cargo)
        people.append({
            "ordem": order, "nome": nome, "cargo": cargo, "area": area, "gestao": gestor,
            "apoio": apoio_areas(apoio, area), "arquivo": path,
        })

    if any(p["ordem"] is not None for p in people):
        people.sort(key=lambda p: (p["ordem"] is None, p["ordem"] or 0, p["nome"].lower()))
    else:
        # Bloco de gestão no topo (Geral primeiro), depois cada área com seus integrantes
        people.sort(key=lambda p: (
            AREA_ORDER.index("Gestão" if p["gestao"] else p["area"]),
            "geral" not in p["cargo"].lower(),
            AREA_ORDER.index(p["area"]),
            "suplente" in p["cargo"].lower(),
            p["nome"].lower(),
        ))

    OUT_IMG.mkdir(parents=True, exist_ok=True)
    used, data = set(), []
    for p in people:
        slug = base = slugify(p["nome"])
        n = 2
        while slug in used:
            slug, n = f"{base}-{n}", n + 1
        used.add(slug)

        im = ImageOps.exif_transpose(Image.open(p["arquivo"])).convert("RGB")
        side = min(im.size + (SIZE,))
        im = ImageOps.fit(im, (side, side), Image.LANCZOS, centering=(0.5, 0.35))
        im.save(OUT_IMG / f"{slug}.jpg", "JPEG", quality=82, optimize=True, progressive=True)

        item = {"nome": p["nome"], "cargo": p["cargo"], "area": p["area"], "gestao": p["gestao"]}
        if p["apoio"]:
            item["apoio"] = p["apoio"]
        item["foto"] = f"assets/img/time/{slug}.jpg"
        data.append(item)

    removed = [f for f in OUT_IMG.glob("*.jpg") if f.stem not in used]
    for f in removed:
        f.unlink()

    lines = ",\n".join("  " + json.dumps(d, ensure_ascii=False) for d in data)
    OUT_JSON.write_text("[\n" + lines + "\n]\n", encoding="utf-8")

    print(f"\n{len(data)} pessoas no time:")
    for d in data:
        filtros = ["Gestão"] if d["gestao"] else []
        filtros += [a for a in [d["area"], *d.get("apoio", [])] if a not in filtros]
        print(f"  {d['nome']:<24} {d['cargo']:<40} [{' + '.join(filtros)}]")
    if removed:
        print(f"\nFotos antigas removidas: {', '.join(f.name for f in removed)}")
    print(f"\nAtualizado: {OUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
