export function mapGuideSteps(stepConfig, stepsCopy = {}, handlers = {}) {
  return (Array.isArray(stepConfig) ? stepConfig : []).map(({
    key,
    target,
    handler
  }) => ({
    target,
    title: stepsCopy[key]?.title || key,
    content: stepsCopy[key]?.content || "",
    ...(handler && handlers[handler] ? {
      onEnter: handlers[handler]
    } : {})
  })).filter(step => step.title && step.content);
}
