use apollo_compiler::Schema;
use glob::glob;
use std::{env, fs, process};

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: graphql-lint <pattern>");
        eprintln!("Example: graphql-lint 'server/**/*.graphql'");
        process::exit(1);
    }

    let pattern = &args[1];
    let mut files: Vec<String> = Vec::new();
    let mut all_sdl = String::new();

    for entry in glob(pattern).expect("Invalid glob pattern").flatten() {
        let path = entry.display().to_string();
        match fs::read_to_string(&entry) {
            Ok(content) => {
                // Add file marker comment for better error reporting
                all_sdl.push_str(&format!("# --- {} ---\n", path));
                all_sdl.push_str(&content);
                all_sdl.push('\n');
                files.push(path);
            }
            Err(e) => {
                eprintln!("Error reading {}: {}", path, e);
            }
        }
    }

    if files.is_empty() {
        eprintln!("No files found matching pattern: {}", pattern);
        process::exit(1);
    }

    eprintln!("Validating {} GraphQL files:", files.len());
    for f in &files {
        eprintln!("  • {}", f);
    }
    eprintln!();

    match Schema::parse_and_validate(&all_sdl, "merged-schema") {
        Ok(_) => {
            println!("✓ Schema is valid ({} files)", files.len());
        }
        Err(diagnostics) => {
            eprintln!("{}", diagnostics);
            process::exit(1);
        }
    }
}
