/**
 * Search Index Generator (sharded + combined)
 */
import { BaseGenerator } from './BaseGenerator.js';
import fs from 'fs/promises';
import path from 'path';

export class SearchIndexGenerator extends BaseGenerator {
  constructor(repoRoot, data, toolDir) {
    super(repoRoot, data, toolDir);
    this.type = 'search';
  }

  async generate() {
    console.log('  Generating search index...');

    const items = [];

    // Profiles
    for (const [profileName, profileData] of Object.entries(this.data.profiles || {})) {
      const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
      items.push({
        type: 'Profile',
        name: profileName,
        url: `pages/profiles/profile-${safeName}.html`,
        keywords: [
          profileName,
          profileData.label || '',
          ...(profileData.applications || []).map(a => typeof a === 'string' ? a : a.name || ''),
          ...(profileData.classes || []).map(c => typeof c === 'string' ? c : c.name || '')
        ].filter(Boolean)
      });
    }

    // Apex Classes
    for (const [className, classData] of Object.entries(this.data.apexClasses || {})) {
      const safeName = className.replace(/[^a-zA-Z0-9]/g, '_');
      items.push({
        type: 'Apex Class',
        name: className,
        url: `pages/apex/class-${safeName}.html`,
        keywords: [
          className,
          classData?.description || '',
          ...(classData?.methods || []).map(m => m.name || '')
        ].filter(Boolean)
      });
    }

    // Objects
    for (const [objName, objData] of Object.entries(this.data.objects || {})) {
      const safeName = objName.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_');
      items.push({
        type: 'Object',
        name: objName,
        url: `pages/objects/object-${safeName}.html`,
        keywords: [
          objName,
          objData?.label || '',
          ...(objData?.fields || []).map(f => f.name || f.label || ''),
          ...(objData?.relationships || []).map(r => r.relatedObject || '')
        ].filter(Boolean)
      });
    }

    // Flows
    for (const [flowName, flowData] of Object.entries(this.data.flows || {})) {
      const safeFlowName = this.sanitizeNodeName(flowName);
      items.push({
        type: 'Flow',
        name: flowName,
        url: `pages/flows/flow-${safeFlowName}.html`,
        keywords: [
          flowName,
          flowData?.label || '',
          flowData?.status || '',
          ...(flowData?.decisions || []).map(d => d.name || d.label || ''),
          ...(flowData?.recordLookups || []).map(r => r.object || '')
        ].filter(Boolean)
      });
    }

    // LWC Components
    for (const [lwcName, lwcData] of Object.entries(this.data.lwcComponents || {})) {
      items.push({
        type: 'LWC Component',
        name: lwcName,
        url: `pages/ui/lwc-${lwcName}.html`,
        keywords: [
          lwcName,
          lwcData?.label || '',
          ...(lwcData?.properties || []).map(p => p.name || '')
        ].filter(Boolean)
      });
    }

    // Permission Sets
    for (const [psName] of Object.entries(this.data.permissionSets || {})) {
      const safeName = psName.replace(/[^a-zA-Z0-9]/g, '_');
      items.push({
        type: 'Permission Set',
        name: psName,
        url: `pages/profiles/permissionset-${safeName}.html`,
        keywords: [psName]
      });
    }

    // FlexiPages
    for (const [pageName, pageData] of Object.entries(this.data.flexiPages || {})) {
      items.push({
        type: 'FlexiPage',
        name: pageName,
        url: `pages/ui/index.html#flexiPagesTable`,
        keywords: [
          pageName,
          pageData?.label || '',
          ...(pageData?.lwcComponents || []).map(c => c.name || '')
        ].filter(Boolean)
      });
    }

    // Aura Components
    for (const [name, d] of Object.entries(this.data.auraComponents || {})) {
      items.push({
        type: 'Aura Component',
        name,
        url: 'pages/ui/index.html#auraTable',
        keywords: [name, d?.description || ''].filter(Boolean)
      });
    }

    // Visualforce Pages
    for (const [name, d] of Object.entries(this.data.visualforcePages || {})) {
      items.push({
        type: 'Visualforce Page',
        name,
        url: 'pages/ui/index.html#vfTable',
        keywords: [name, d?.label || ''].filter(Boolean)
      });
    }

    // Custom Metadata Types
    for (const [typeName] of Object.entries(this.data.customMetadata || {})) {
      const safeType = typeName.replace(/[^a-zA-Z0-9]/g, '_');
      items.push({
        type: 'Custom Metadata Type',
        name: typeName,
        url: `pages/custommetadata/type-${safeType}.html`,
        keywords: [typeName]
      });
    }

    // Quick Actions
    for (const [objName, actions] of Object.entries(this.data.quickActions || {})) {
      for (const [actionName, d] of Object.entries(actions)) {
        items.push({
          type: 'Quick Action',
          name: `${objName}.${actionName}`,
          url: 'pages/automation/index.html#quickActionsTable',
          keywords: [actionName, objName, d?.label || '', d?.type || ''].filter(Boolean)
        });
      }
    }

    // Sharing Rules
    for (const [objName] of Object.entries(this.data.sharingRules || {})) {
      items.push({
        type: 'Sharing Rules',
        name: objName,
        url: 'pages/automation/index.html#sharingRulesTable',
        keywords: [objName, 'sharing', 'rule']
      });
    }

    // Roles
    for (const [roleName, d] of Object.entries(this.data.roles || {})) {
      items.push({
        type: 'Role',
        name: roleName,
        url: 'pages/profiles/index.html#rolesTable',
        keywords: [roleName, d?.name || ''].filter(Boolean)
      });
    }

    // Queues
    for (const [queueName, d] of Object.entries(this.data.queues || {})) {
      items.push({
        type: 'Queue',
        name: queueName,
        url: 'pages/profiles/index.html#queuesTable',
        keywords: [queueName, d?.name || '', ...(d?.objects || [])].filter(Boolean)
      });
    }

    // Static Resources
    for (const [name, d] of Object.entries(this.data.staticResources || {})) {
      items.push({
        type: 'Static Resource',
        name,
        url: 'pages/integrations/index.html#staticResourcesTable',
        keywords: [name, d?.contentType || ''].filter(Boolean)
      });
    }

    // Global Value Sets
    for (const [name] of Object.entries(this.data.globalValueSets || {})) {
      items.push({
        type: 'Global Value Set',
        name,
        url: 'pages/objects/index.html#globalValueSetsTable',
        keywords: [name, 'picklist', 'value set']
      });
    }

    // Key documentation pages
    items.push({
      type: 'Page',
      name: 'Custom Metadata Types',
      url: 'pages/custommetadata/index.html',
      keywords: ['custom metadata', 'cmt', 'configuration', 'deployment']
    });
    items.push({
      type: 'Page',
      name: 'Functional Map',
      url: 'pages/architecture/functional-map.html',
      keywords: ['architecture', 'dependencies', 'flows', 'apex', 'lwc', 'objects']
    });
    items.push({
      type: 'Page',
      name: 'Security Matrix',
      url: 'pages/profiles/permissions-matrix.html',
      keywords: ['security', 'profiles', 'permission sets', 'object access']
    });
    items.push({
      type: 'Page',
      name: 'Documentation Health',
      url: 'pages/maintenance/health.html',
      keywords: ['maintenance', 'coverage', 'quality', 'orphaned']
    });

    const dataDir = path.join(this.outputDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Combined index (backward compatibility)
    const combined = { version: '1.0', generatedAt: new Date().toISOString(), items };
    await fs.writeFile(path.join(dataDir, 'search-index.json'), JSON.stringify(combined, null, 2), 'utf-8');

    // Sharded indexes
    try {
      const searchDir = path.join(dataDir, 'search');
      await fs.mkdir(searchDir, { recursive: true });
      const byType = items.reduce((acc, item) => {
        const key = (item.type || 'Other').toLowerCase().replace(/\s+/g, '');
        (acc[key] = acc[key] || []).push(item);
        return acc;
      }, {});
      const manifest = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        shards: Object.entries(byType).map(([key, arr]) => ({
          type: arr[0]?.type || key,
          key,
          url: `data/search/${key}.json`,
          count: arr.length
        }))
      };
      await fs.writeFile(path.join(searchDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
      for (const [key, arr] of Object.entries(byType)) {
        await fs.writeFile(path.join(searchDir, `${key}.json`), JSON.stringify({ items: arr }, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Could not write sharded search indexes:', e?.message || e);
    }

    console.log(`    Generated search index: ${items.length} items.`);
  }
}
