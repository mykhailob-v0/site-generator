/**
 * React Frontend Example
 * Demonstrates how to use the HTML Generator API from a web interface
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const HTMLGeneratorApp = () => {
  // State management
  const [formData, setFormData] = useState({
    primaryKeyword: '',
    brandName: '',
    secondaryKeywords: [],
    focusAreas: [],
    canonicalUrl: '',
    hreflangUrls: {},
    targetLanguage: 'tr'
  });

  const [schema, setSchema] = useState(null);
  const [validation, setValidation] = useState(null);
  const [generation, setGeneration] = useState({
    isGenerating: false,
    progress: null,
    result: null,
    error: null
  });

  const [availableFocusAreas] = useState([
    'güvenlik', 'mobil', 'destek', 'bonus', 'hızlı', 'casino', 
    'spor', 'canlı', 'ödeme', 'lisans', 'vip', 'promosyon'
  ]);

  // Load schema on component mount
  useEffect(() => {
    loadSchema();
  }, []);

  // Validate input when form data changes
  useEffect(() => {
    if (formData.primaryKeyword && formData.brandName) {
      validateInput();
    }
  }, [formData]);

  /**
   * Load input schema from API
   */
  const loadSchema = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/schema`);
      setSchema(response.data.schema);
    } catch (error) {
      console.error('Failed to load schema:', error);
    }
  };

  /**
   * Validate current input
   */
  const validateInput = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/validate`, formData);
      setValidation(response.data);
    } catch (error) {
      console.error('Validation failed:', error);
      setValidation({ valid: false, error: 'Validation request failed' });
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle array input changes (keywords, focus areas)
   */
  const handleArrayInputChange = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: array
    }));
  };

  /**
   * Handle hreflang URL changes
   */
  const handleHreflangChange = (lang, url) => {
    setFormData(prev => ({
      ...prev,
      hreflangUrls: {
        ...prev.hreflangUrls,
        [lang]: url
      }
    }));
  };

  /**
   * Generate website with Server-Sent Events for progress
   */
  const generateWebsite = async () => {
    if (!validation?.valid) {
      alert('Please fix validation errors before generating');
      return;
    }

    setGeneration({
      isGenerating: true,
      progress: null,
      result: null,
      error: null
    });

    try {
      // Use EventSource for Server-Sent Events
      const eventSource = new EventSource(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setGeneration(prev => ({
            ...prev,
            progress: {
              step: data.step,
              percentage: data.percentage,
              message: data.message
            }
          }));
        } else if (data.type === 'result') {
          setGeneration(prev => ({
            ...prev,
            isGenerating: false,
            result: data
          }));
          eventSource.close();
        } else if (data.type === 'error') {
          setGeneration(prev => ({
            ...prev,
            isGenerating: false,
            error: data.error
          }));
          eventSource.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setGeneration(prev => ({
          ...prev,
          isGenerating: false,
          error: 'Connection error during generation'
        }));
        eventSource.close();
      };

    } catch (error) {
      setGeneration(prev => ({
        ...prev,
        isGenerating: false,
        error: error.message
      }));
    }
  };

  return (
    <div className="html-generator-app">
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">
          HTML Website Generator
        </h1>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Website Configuration</h2>
          
          {/* Primary Keyword */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Primary Keyword *
            </label>
            <input
              type="text"
              value={formData.primaryKeyword}
              onChange={(e) => handleInputChange('primaryKeyword', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Paribahis"
            />
          </div>

          {/* Brand Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Brand Name *
            </label>
            <input
              type="text"
              value={formData.brandName}
              onChange={(e) => handleInputChange('brandName', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Paribahis Resmi"
            />
          </div>

          {/* Secondary Keywords */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Secondary Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={formData.secondaryKeywords.join(', ')}
              onChange={(e) => handleArrayInputChange('secondaryKeywords', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., bahis, casino, spor"
            />
          </div>

          {/* Focus Areas */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Focus Areas
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableFocusAreas.map(area => (
                <label key={area} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.focusAreas.includes(area)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleInputChange('focusAreas', [...formData.focusAreas, area]);
                      } else {
                        handleInputChange('focusAreas', formData.focusAreas.filter(a => a !== area));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{area}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Canonical URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Canonical URL
            </label>
            <input
              type="url"
              value={formData.canonicalUrl}
              onChange={(e) => handleInputChange('canonicalUrl', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>

          {/* Hreflang URLs */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              International URLs (Hreflang)
            </label>
            <div className="space-y-2">
              {['tr', 'en', 'de', 'fr', 'es', 'ru'].map(lang => (
                <div key={lang} className="flex items-center space-x-2">
                  <span className="w-8 text-sm font-medium">{lang}:</span>
                  <input
                    type="url"
                    value={formData.hreflangUrls[lang] || ''}
                    onChange={(e) => handleHreflangChange(lang, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder={`https://${lang}.example.com`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Validation Results */}
        {validation && (
          <div className={`mb-6 p-4 rounded-lg ${
            validation.valid ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            <h3 className="font-semibold mb-2">
              {validation.valid ? '✅ Input Valid' : '❌ Validation Errors'}
            </h3>
            
            {!validation.valid && validation.error && (
              <p className="text-red-700 mb-2">{validation.error}</p>
            )}
            
            {validation.warnings && validation.warnings.length > 0 && (
              <div>
                <p className="font-medium text-yellow-700 mb-1">Warnings:</p>
                <ul className="list-disc list-inside text-yellow-700">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Generation Controls */}
        <div className="text-center mb-6">
          <button
            onClick={generateWebsite}
            disabled={!validation?.valid || generation.isGenerating}
            className={`px-8 py-3 rounded-lg font-semibold text-white ${
              !validation?.valid || generation.isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {generation.isGenerating ? 'Generating...' : 'Generate Website'}
          </button>
        </div>

        {/* Progress Display */}
        {generation.progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Generation Progress</h3>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generation.progress.percentage}%` }}
              ></div>
            </div>
            <p className="text-blue-700">
              <strong>{generation.progress.step}:</strong> {generation.progress.message} ({generation.progress.percentage}%)
            </p>
          </div>
        )}

        {/* Generation Results */}
        {generation.result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">✅ Generation Completed</h3>
            
            {generation.result.outputPath && (
              <p className="text-green-700 mb-2">
                <strong>Output File:</strong> {generation.result.outputPath}
              </p>
            )}
            
            {generation.result.rawHtmlPath && (
              <p className="text-green-700 mb-2">
                <strong>Raw HTML:</strong> {generation.result.rawHtmlPath}
              </p>
            )}
            
            {generation.result.generatedFiles && (
              <div>
                <p className="font-medium text-green-700 mb-1">Generated Files:</p>
                <ul className="list-disc list-inside text-green-700">
                  {generation.result.generatedFiles.map((file, index) => (
                    <li key={index}>{file}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {generation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">❌ Generation Error</h3>
            <p className="text-red-700">{generation.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HTMLGeneratorApp;
