export interface WikipediaValidationResult {
  exists: boolean
  isBiography: boolean
}

export interface WikipediaValidator {
  validatePage(url: string): Promise<WikipediaValidationResult>
}
