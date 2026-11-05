
from pathlib import Path

source = Path("game.unx")
chunk_size = 45 * 1024 * 1024

with source.open("rb") as file:
    index = 0

    while data := file.read(chunk_size):
        output = Path(f"game.unx.part{index}")
        output.write_bytes(data)

        print(f"Created {output}: {len(data):,} bytes")
        index += 1

print(f"Finished! Created {index} chunks.")
