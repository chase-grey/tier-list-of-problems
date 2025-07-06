declare module "*.json" {
  // Define a more specific type that represents our JSON structure
  // This is safer than using 'any'
  const value: Record<string, unknown>;
  export default value;
}
