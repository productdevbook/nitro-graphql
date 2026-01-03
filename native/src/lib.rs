use apollo_compiler::Schema;
use napi_derive::napi;
use std::fs;

/// Validation result from GraphQL schema linting
#[napi(object)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub file_count: u32,
}

/// File info for tracking source locations
struct FileInfo {
    path: String,
    start_line: usize,
    end_line: usize,
}

/// Validate GraphQL schema files
/// Returns validation result with errors if any
#[napi]
pub fn validate_schemas(file_paths: Vec<String>) -> ValidationResult {
    if file_paths.is_empty() {
        return ValidationResult {
            valid: false,
            errors: vec!["No files provided".to_string()],
            file_count: 0,
        };
    }

    let mut all_sdl = String::new();
    let mut errors: Vec<String> = Vec::new();
    let mut file_count: u32 = 0;
    let mut file_infos: Vec<FileInfo> = Vec::new();
    let mut current_line: usize = 1;

    for path in &file_paths {
        match fs::read_to_string(path) {
            Ok(content) => {
                let line_count = content.lines().count().max(1);
                file_infos.push(FileInfo {
                    path: path.clone(),
                    start_line: current_line,
                    end_line: current_line + line_count - 1, // inclusive
                });
                all_sdl.push_str(&content);
                if !content.ends_with('\n') {
                    all_sdl.push('\n');
                }
                current_line += line_count;
                file_count += 1;
            }
            Err(e) => {
                errors.push(format!("Error reading {}: {}", path, e));
            }
        }
    }

    if file_count == 0 {
        return ValidationResult {
            valid: false,
            errors,
            file_count: 0,
        };
    }

    match Schema::parse_and_validate(&all_sdl, "merged-schema") {
        Ok(_) => ValidationResult {
            valid: true,
            errors: vec![],
            file_count,
        },
        Err(diagnostics) => {
            let error_str = diagnostics.to_string();
            // Replace line references with file paths
            let enhanced_errors = enhance_errors_with_paths(&error_str, &file_infos);

            ValidationResult {
                valid: false,
                errors: enhanced_errors,
                file_count,
            }
        }
    }
}

/// Find file info for a given merged line number
fn find_file_for_line<'a>(line_num: usize, file_infos: &'a [FileInfo]) -> Option<(&'a FileInfo, usize)> {
    for info in file_infos {
        if line_num >= info.start_line && line_num <= info.end_line {
            let relative_line = line_num - info.start_line + 1;
            return Some((info, relative_line));
        }
    }
    None
}

/// Enhance error messages with file paths
fn enhance_errors_with_paths(error_str: &str, file_infos: &[FileInfo]) -> Vec<String> {
    use regex::Regex;

    let mut result = error_str.to_string();

    // Step 1: Replace merged-schema:LINE:COL with actual file path in headers
    let header_re = Regex::new(r"merged-schema:(\d+)(?::(\d+))?").unwrap();
    result = header_re.replace_all(&result, |caps: &regex::Captures| {
        let line_num: usize = caps[1].parse().unwrap_or(1);
        let col = caps.get(2).map(|m| m.as_str()).unwrap_or("1");

        if let Some((info, relative_line)) = find_file_for_line(line_num, file_infos) {
            format!("{}:{}:{}", info.path, relative_line, col)
        } else {
            format!("merged-schema:{}:{}", line_num, col)
        }
    }).to_string();

    // Step 2: Process body line numbers and add file path annotations
    // Pattern: line numbers at start of lines like " 41 │" or "  5 │"
    let line_re = Regex::new(r"(?m)^(\s*)(\d+)(\s*│)").unwrap();

    // Track which files we've seen to add separators
    let mut last_file_path: Option<String> = None;
    let lines: Vec<String> = result.lines().map(|s| s.to_string()).collect();
    let mut new_lines: Vec<String> = Vec::new();

    for line in &lines {
        // Check if this line has a line number
        if let Some(caps) = line_re.captures(line) {
            let line_num: usize = caps[2].parse().unwrap_or(0);

            if line_num > 0 {
                if let Some((info, relative_line)) = find_file_for_line(line_num, file_infos) {
                    // Check if we're switching to a different file
                    let current_file = info.path.clone();
                    let needs_separator = match &last_file_path {
                        Some(last) => last != &current_file,
                        None => false,
                    };

                    if needs_separator {
                        // Add a file separator line before this line
                        new_lines.push(format!("    ├─[ {}:{} ]", info.path, relative_line));
                    }

                    last_file_path = Some(current_file);

                    // Replace the merged line number with relative line number
                    let new_line = line_re.replace(line, |c: &regex::Captures| {
                        format!("{}{}{}", &c[1], relative_line, &c[3])
                    });
                    new_lines.push(new_line.to_string());
                    continue;
                }
            }
        }

        // Check if this is a header line to track the current file
        if line.contains("╭─[") || line.contains("├─[") {
            // Extract file path from header
            let path_re = Regex::new(r"\[([^:]+):").unwrap();
            if let Some(caps) = path_re.captures(line) {
                last_file_path = Some(caps[1].trim().to_string());
            }
        }

        new_lines.push(line.clone());
    }

    vec![new_lines.join("\n")]
}

/// Validate GraphQL schema from string content with file paths
#[napi]
pub fn validate_schema_string_with_paths(contents: Vec<String>, paths: Vec<String>) -> ValidationResult {
    if contents.is_empty() {
        return ValidationResult {
            valid: false,
            errors: vec!["No content provided".to_string()],
            file_count: 0,
        };
    }

    let mut all_sdl = String::new();
    let mut file_infos: Vec<FileInfo> = Vec::new();
    let mut current_line: usize = 1;

    for (i, content) in contents.iter().enumerate() {
        let path = paths.get(i).map(|s| s.as_str()).unwrap_or("unknown");
        let line_count = content.lines().count().max(1);
        file_infos.push(FileInfo {
            path: path.to_string(),
            start_line: current_line,
            end_line: current_line + line_count - 1, // inclusive
        });
        all_sdl.push_str(content);
        if !content.ends_with('\n') {
            all_sdl.push('\n');
        }
        current_line += line_count;
    }

    let file_count = contents.len() as u32;

    match Schema::parse_and_validate(&all_sdl, "merged-schema") {
        Ok(_) => ValidationResult {
            valid: true,
            errors: vec![],
            file_count,
        },
        Err(diagnostics) => {
            let error_str = diagnostics.to_string();
            let enhanced_errors = enhance_errors_with_paths(&error_str, &file_infos);

            ValidationResult {
                valid: false,
                errors: enhanced_errors,
                file_count,
            }
        }
    }
}

/// Validate GraphQL schema from string content (simple version)
#[napi]
pub fn validate_schema_string(content: String) -> ValidationResult {
    match Schema::parse_and_validate(&content, "schema") {
        Ok(_) => ValidationResult {
            valid: true,
            errors: vec![],
            file_count: 1,
        },
        Err(diagnostics) => {
            let error_str = diagnostics.to_string();
            ValidationResult {
                valid: false,
                errors: vec![error_str],
                file_count: 1,
            }
        }
    }
}
