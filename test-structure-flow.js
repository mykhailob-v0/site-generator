#!/usr/bin/env node

/**
 * Test Script: Structure Flow Test
 * Purpose: Test how structure data flows from structure file to content service
 */

const fs = require('fs');
const path = require('path');

// Import the content service
const ContentService = require('./services/ai/content.service.js');

// Test structure data flow
async function testStructureFlow() {
  console.log('🧪 Testing Structure Data Flow...\n');
  
  try {
    // 1. Load the actual structure file that was generated
    const structureFilePath = './output/paribahis-giris-onli-2025-09-07/structure-paribahis-giris-online-2025-2025-09-07T07-00-17.json';
    const structureData = JSON.parse(fs.readFileSync(structureFilePath, 'utf8'));
    
    console.log('📄 Loaded Structure File:');
    console.log('- File Path:', structureFilePath);
    console.log('- Has structure property:', !!structureData.structure);
    console.log('- Has nested structure:', !!structureData.structure?.structure);
    console.log('- Sections count:', structureData.structure?.structure?.sections?.length || 0);
    console.log('- Structure sections:', structureData.structure?.structure?.sections?.map(s => s.name) || []);
    console.log('');
    
    // 2. Simulate how orchestrator passes data to content service (chained input format)
    const chainedInput = {
      serviceType: 'StructureService',
      data: {
        success: true,
        structure: structureData.structure, // This is what StructureService returns
        metadata: structureData.metadata
      },
      // Original orchestrator params
      primaryKeyword: 'Paribahis Giris online 2025',
      brandName: 'Paribahis',
      canonicalUrl: 'https://www.massagetherapybeaumont.com',
      hreflangUrls: { tr: 'https://www.massagetherapybeaumont.com' },
      secondaryKeywords: ['Paribahis', 'Test', 'casino'],
      focusAreas: ['güvenlik', 'bonus', 'mobil']
    };
    
    console.log('🔗 Simulated Chained Input:');
    console.log('- Service Type:', chainedInput.serviceType);
    console.log('- Has data:', !!chainedInput.data);
    console.log('- Data success:', chainedInput.data.success);
    console.log('- Data has structure:', !!chainedInput.data.structure);
    console.log('- Data structure has nested structure:', !!chainedInput.data.structure?.structure);
    console.log('- Final sections count:', chainedInput.data.structure?.structure?.sections?.length || 0);
    console.log('');
    
    // 3. Test the mergedParams logic from content service
    console.log('🔧 Testing Merged Params Logic:');
    const mergedParams = {
      ...chainedInput, // Original params from orchestrator (primaryKeyword, etc.)
      ...chainedInput.data, // Contains { success: true, structure, metadata }
      structure: chainedInput.data.structure // Ensure structure is properly set at root level
    };
    
    console.log('- Merged params has structure:', !!mergedParams.structure);
    console.log('- Merged structure has nested structure:', !!mergedParams.structure?.structure);
    console.log('- Merged final sections count:', mergedParams.structure?.structure?.sections?.length || 0);
    console.log('');
    
    // 4. Test the structure access logic from buildContentPrompt
    console.log('🎯 Testing Structure Access Logic:');
    let actualStructure = mergedParams.structure;
    
    console.log('Step 1 - Initial structure:', !!actualStructure);
    console.log('Step 1 - Structure keys:', actualStructure ? Object.keys(actualStructure) : null);
    
    // Handle multiple levels of nesting that can occur in service chaining
    if (actualStructure && actualStructure.data && actualStructure.data.structure) {
      console.log('Step 2 - Found data.structure, accessing...');
      actualStructure = actualStructure.data.structure;
    }
    if (actualStructure && actualStructure.structure) {
      console.log('Step 3 - Found nested structure, accessing...');
      actualStructure = actualStructure.structure;
    }
    
    console.log('Final result:');
    console.log('- Final structure exists:', !!actualStructure);
    console.log('- Final sections count:', actualStructure?.sections?.length || 0);
    console.log('- Final sections names:', actualStructure?.sections?.map(s => s.name) || []);
    console.log('');
    
    // 5. Show what the current logic produces vs what we expect
    console.log('🔍 Analysis:');
    const expected = 12;
    const actual = actualStructure?.sections?.length || 0;
    
    if (actual === expected) {
      console.log(`✅ SUCCESS: Structure access works correctly (${actual}/${expected} sections)`);
    } else {
      console.log(`❌ FAILURE: Structure access failed (${actual}/${expected} sections)`);
      console.log('');
      console.log('🔧 Debug Info:');
      console.log('Raw structure path:', typeof mergedParams.structure);
      console.log('Structure keys:', mergedParams.structure ? Object.keys(mergedParams.structure) : null);
      console.log('Structure.structure exists:', !!mergedParams.structure?.structure);
      console.log('Structure.structure keys:', mergedParams.structure?.structure ? Object.keys(mergedParams.structure.structure) : null);
      console.log('Structure.structure.sections exists:', !!mergedParams.structure?.structure?.sections);
    }
    
    // 6. Test with actual ContentService instance
    console.log('🏭 Testing with Real ContentService:');
    try {
      // Note: We're not actually calling the API since we don't want to waste tokens
      // We're just testing the parameter processing logic
      const contentService = new ContentService(process.env.OPENAI_API_KEY || 'test-key');
      
      // Test the buildContentPrompt method parameter processing
      console.log('Testing buildContentPrompt parameter processing...');
      
      // Monkey patch the promptService to avoid actual file loading
      contentService.promptService = {
        getContentGenerationPrompt: async (vars) => {
          console.log('Template variables received:');
          console.log('- PRIMARY_KEYWORD:', vars.PRIMARY_KEYWORD);
          console.log('- STRUCTURE length:', vars.STRUCTURE ? vars.STRUCTURE.length : 0);
          console.log('- STRUCTURE has sections:', vars.STRUCTURE ? vars.STRUCTURE.includes('sections') : false);
          return 'mock-prompt';
        }
      };
      
      // Override logOperation to capture logs
      const logs = [];
      contentService.logOperation = (operation, data) => {
        logs.push({ operation, data });
        console.log(`Log: ${operation}`, data);
      };
      
      // Test the buildContentPrompt method with our merged params
      await contentService.buildContentPrompt(mergedParams);
      
      // Analyze the logs
      const buildPromptLog = logs.find(log => log.operation === 'buildContentPrompt');
      if (buildPromptLog) {
        console.log('');
        console.log('📊 ContentService Log Analysis:');
        console.log('- hasStructure:', buildPromptLog.data.hasStructure);
        console.log('- structureSections:', buildPromptLog.data.structureSections);
        
        if (buildPromptLog.data.structureSections === 12) {
          console.log('✅ ContentService correctly processed structure!');
        } else {
          console.log('❌ ContentService failed to process structure correctly');
        }
      }
      
    } catch (error) {
      console.log('⚠️  ContentService test failed (expected without API key):', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testStructureFlow();
