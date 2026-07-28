(function() {
  'use strict';

  const SOURCES = Object.freeze([
    Object.freeze({ value: 'content', label: 'Content', contentWeight: 100, metadataWeight: 0 }),
    Object.freeze({ value: 'metadata', label: 'Metadata', contentWeight: 0, metadataWeight: 100 }),
    Object.freeze({ value: 'mixed', label: 'Both', contentWeight: 50, metadataWeight: 50 })
  ]);

  function normalize(value) {
    return SOURCES.some((source) => source.value === value) ? value : 'mixed';
  }

  function weightsFor(value) {
    const source = SOURCES.find((candidate) => candidate.value === normalize(value));
    return {
      mode: source.value,
      contentWeight: source.contentWeight,
      metadataWeight: source.metadataWeight
    };
  }

  function options() {
    return SOURCES.slice();
  }

  window.VincariosSimilaritySourceOptions = Object.freeze({ normalize, options, weightsFor });
})();
