import os

IGNORE_DIRS = {
    '.git', 'node_modules', 'venv', '__pycache__', '.upm', 'dist', 'build', 
    '.local', 'attached_assets', '.pythonlibs', '.cache', '.npm', '.config',
    'coverage', '.nyc_output', '.next', '.nuxt', '.svelte-kit'
}
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'poetry.lock', '.replit', 'replit.nix', 
    'full_codebase.txt', '.env', '.env.local'
}
SOURCE_DIRS = {'client', 'server', 'shared', 'src'}
INCLUDE_EXTS = {'.py', '.js', '.ts', '.tsx', '.jsx', '.css', '.md', '.sql'}

def merge_codebase(output_file='full_codebase.txt'):
    total_chars = 0
    file_count = 0
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("# Merf.ai - Codebase Dump\n")
        outfile.write("# Kaynak kod dosyalari\n\n")
        
        for source_dir in SOURCE_DIRS:
            if not os.path.exists(source_dir):
                continue
                
            for root, dirs, files in os.walk(source_dir):
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                
                for file in files:
                    if file in IGNORE_FILES:
                        continue
                    
                    _, ext = os.path.splitext(file)
                    if ext in INCLUDE_EXTS:
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as infile:
                                content = infile.read()
                                outfile.write(f"\n\n--- FILE START: {file_path} ---\n")
                                outfile.write(content)
                                outfile.write(f"\n--- FILE END: {file_path} ---\n")
                                total_chars += len(content)
                                file_count += 1
                        except Exception as e:
                            print(f"Hata okunamadi: {file_path} -> {e}")
        
        for root_file in ['replit.md', 'design_guidelines.md', 'drizzle.config.ts', 'tailwind.config.ts', 'vite.config.ts']:
            if os.path.exists(root_file):
                try:
                    with open(root_file, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        outfile.write(f"\n\n--- FILE START: {root_file} ---\n")
                        outfile.write(content)
                        outfile.write(f"\n--- FILE END: {root_file} ---\n")
                        total_chars += len(content)
                        file_count += 1
                except Exception as e:
                    print(f"Hata okunamadi: {root_file} -> {e}")

    estimated_tokens = total_chars // 4
    print(f"\nIslem tamam!")
    print(f"Toplam {file_count} dosya '{output_file}' dosyasina kaydedildi.")
    print(f"Toplam karakter: {total_chars:,}")
    print(f"Tahmini token sayisi: ~{estimated_tokens:,} token")

if __name__ == "__main__":
    merge_codebase()
