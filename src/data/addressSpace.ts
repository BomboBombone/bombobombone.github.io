import type { CollectionEntry } from 'astro:content';
import { profileSymbols } from './profile';
import { projectPointers } from './projects';
import { researchCredits } from './researchCredits';
import { webCategories, webCategoryFor } from './webCategories';

export type PublishedPost = CollectionEntry<'posts'>;

export interface MemoryRegion {
  id: string;
  base: string;
  size: string;
  type: string;
  protect: string;
  name: string;
  surface: string;
  description: string;
  notes: string;
  state: string;
  depth?: number;
  parentId?: string;
  href?: string;
}

export interface PostAllocation {
  slug: string;
  regionId: string;
  regionName: string;
  contentAddress: number;
  byteLength: number;
  allocatedSize: number;
  indexAddress: number;
  indexByteLength: number;
  indexAllocatedSize: number;
}

export interface DataAllocation {
  key: string;
  address: number;
  byteLength: number;
  allocatedSize: number;
}

export interface AddressSpace {
  regions: MemoryRegion[];
  mapStart: number;
  mapEnd: number;
  postAllocations: Record<string, PostAllocation>;
  profileAllocations: Record<string, DataAllocation>;
  projectAllocations: Record<string, DataAllocation>;
}

type RegionInput = Omit<MemoryRegion, 'base' | 'size'>;

const IMAGE_BASE = 0x400000;
const PAGE_SIZE = 0x1000;
const RECORD_ALIGNMENT = 0x10;
const POST_ALIGNMENT = 0x100;

export const alignUp = (value: number, alignment: number) => Math.ceil(value / alignment) * alignment;
export const formatAddress = (address: number) => address.toString(16).padStart(16, '0').toUpperCase();
export const formatSize = (size: number) => size.toString(16).padStart(8, '0').toUpperCase();
export const utf8ByteLength = (value: string) => new TextEncoder().encode(value.replace(/\r\n?/g, '\n')).length;

export const sectionIdForPost = (category: string) => {
  const webCategory = webCategoryFor(category);
  if (webCategory) return webCategory.id;

  const normalized = category.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  if (normalized.includes('windows') || normalized.includes('kernel') || normalized.includes('driver')) {
    return normalized.includes('kernel') || normalized.includes(' km') || normalized.endsWith('km') ? 'windows-km' : 'windows-um';
  }

  return 'data';
};

const allocationSize = (byteLength: number, alignment: number) => alignUp(Math.max(1, byteLength), alignment);
const postSuffix = (count: number) => count ? ` · ${count} ${count === 1 ? 'post' : 'posts'}` : '';

export function buildAddressSpace(posts: PublishedPost[], baseUrl: string): AddressSpace {
  const sortedPosts = [...posts].sort((left, right) => left.slug.localeCompare(right.slug, 'en'));
  const groupedPosts = new Map<string, PublishedPost[]>();
  sortedPosts.forEach((post) => {
    const sectionId = sectionIdForPost(post.data.category);
    groupedPosts.set(sectionId, [...(groupedPosts.get(sectionId) ?? []), post]);
  });

  const postAllocations: Record<string, PostAllocation> = {};
  const profileAllocations: Record<string, DataAllocation> = {};
  const projectAllocations: Record<string, DataAllocation> = {};
  const regions: MemoryRegion[] = [];
  let cursor = IMAGE_BASE;

  const addSimpleSection = (section: RegionInput, size: number) => {
    const numericBase = cursor;
    const numericSize = alignUp(size, PAGE_SIZE);
    const region = { ...section, base: formatAddress(numericBase), size: formatSize(numericSize) };
    regions.push(region);
    cursor += numericSize;
    return { region, numericBase, numericSize };
  };

  addSimpleSection({ id: 'text', type: 'CODE', protect: 'ER--', name: '.text', surface: 'PE', description: 'Source code', notes: 'SOURCE', state: 'MAPPED', href: 'https://github.com/BomboBombone/bombobombone.github.io' }, 0x20000);

  let profileOffset = 0;
  const profileRecords = profileSymbols.map((symbol) => {
    const byteLength = utf8ByteLength(symbol.value) + 1;
    const allocatedSize = allocationSize(byteLength, RECORD_ALIGNMENT);
    const record = { key: symbol.key, offset: profileOffset, byteLength, allocatedSize };
    profileOffset += allocatedSize;
    return record;
  });
  const rdata = addSimpleSection({ id: 'rdata', type: 'DATA', protect: 'R---', name: '.rdata', surface: 'PE', description: 'About me', notes: 'CONST', state: 'MAPPED', href: `${baseUrl}profile/` }, Math.max(PAGE_SIZE, profileOffset));
  profileRecords.forEach((record) => {
    profileAllocations[record.key] = { ...record, address: rdata.numericBase + record.offset };
  });

  let dataOffset = 0;
  const indexRecords = sortedPosts.map((post) => {
    const byteLength = utf8ByteLength(post.data.title) + 1;
    const allocatedSize = allocationSize(byteLength, RECORD_ALIGNMENT);
    const record = { post, offset: dataOffset, byteLength, allocatedSize };
    dataOffset += allocatedSize;
    return record;
  });
  dataOffset = alignUp(dataOffset, POST_ALIGNMENT);
  const dataContentRecords = (groupedPosts.get('data') ?? []).map((post) => {
    const byteLength = utf8ByteLength(post.body);
    const allocatedSize = allocationSize(byteLength, POST_ALIGNMENT);
    const record = { post, offset: dataOffset, byteLength, allocatedSize };
    dataOffset += allocatedSize;
    return record;
  });
  const data = addSimpleSection({ id: 'data', type: 'DATA', protect: 'RW--', name: '.data', surface: 'PE', description: `All posts, A–Z${postSuffix(sortedPosts.length)}`, notes: 'XREF', state: sortedPosts.length ? 'MAPPED' : 'UNMAPPED', href: `${baseUrl}data/` }, Math.max(PAGE_SIZE, dataOffset));
  indexRecords.forEach(({ post, offset, byteLength, allocatedSize }) => {
    postAllocations[post.slug] = {
      slug: post.slug,
      regionId: sectionIdForPost(post.data.category),
      regionName: '',
      contentAddress: 0,
      byteLength: utf8ByteLength(post.body),
      allocatedSize: allocationSize(utf8ByteLength(post.body), POST_ALIGNMENT),
      indexAddress: data.numericBase + offset,
      indexByteLength: byteLength,
      indexAllocatedSize: allocatedSize,
    };
  });
  dataContentRecords.forEach(({ post, offset, byteLength, allocatedSize }) => {
    Object.assign(postAllocations[post.slug], {
      contentAddress: data.numericBase + offset,
      byteLength,
      allocatedSize,
    });
  });

  let projectOffset = 0;
  const projectRecords = projectPointers.map((project) => {
    const byteLength = utf8ByteLength(project.value) + 1;
    const allocatedSize = allocationSize(byteLength, RECORD_ALIGNMENT);
    const record = { key: project.key, offset: projectOffset, byteLength, allocatedSize };
    projectOffset += allocatedSize;
    return record;
  });
  const pdata = addSimpleSection({ id: 'pdata', type: 'PTR', protect: 'R---', name: '.pdata', surface: 'PE', description: 'My projects', notes: 'XREF', state: projectPointers.length ? 'MAPPED' : 'UNMAPPED', href: `${baseUrl}projects/` }, Math.max(PAGE_SIZE, projectOffset));
  projectRecords.forEach((record) => {
    projectAllocations[record.key] = { ...record, address: pdata.numericBase + record.offset };
  });

  const resourceBytes = researchCredits.reduce((total, credit) => total + utf8ByteLength(credit.cve) + utf8ByteLength(credit.advisory) + 2, 0);
  addSimpleSection({ id: 'tooling', type: 'PRV', protect: 'R---', name: '.rsrc', surface: 'TOOLING', description: `Research index · ${researchCredits.length} CVEs`, notes: 'XREF', state: 'MAPPED', href: `${baseUrl}about/` }, Math.max(PAGE_SIZE, resourceBytes));

  const addNestedSection = (section: RegionInput, childDefinitions: { id: string; type: string; protect: string; name: string; surface: string; description: string; notes: string; href: string }[]) => {
    const parentBase = cursor;
    const childRegions: MemoryRegion[] = [];
    childDefinitions.forEach((child) => {
      const childPosts = groupedPosts.get(child.id) ?? [];
      const childBase = cursor;
      let childOffset = 0;
      childPosts.forEach((post) => {
        const allocation = postAllocations[post.slug];
        allocation.contentAddress = childBase + childOffset;
        childOffset += allocation.allocatedSize;
      });
      const childSize = alignUp(Math.max(PAGE_SIZE, childOffset), PAGE_SIZE);
      childRegions.push({
        ...child,
        base: formatAddress(childBase),
        size: formatSize(childSize),
        depth: 1,
        parentId: section.id,
        state: childPosts.length ? 'MAPPED' : 'UNMAPPED',
      });
      cursor += childSize;
    });
    const parentSize = cursor - parentBase;
    regions.push({ ...section, base: formatAddress(parentBase), size: formatSize(parentSize) }, ...childRegions);
  };

  const webPostCount = webCategories.reduce((total, category) => total + (groupedPosts.get(category.id)?.length ?? 0), 0);
  if (webPostCount) {
    addNestedSection({ id: 'web', type: 'MAP', protect: 'ER--', name: '.web', surface: 'WEB', description: `Web security${postSuffix(webPostCount)}`, notes: 'XREF', state: 'MAPPED' }, webCategories.map((category) => {
      const count = groupedPosts.get(category.id)?.length ?? 0;
      return {
        id: category.id,
        type: 'MAP',
        protect: category.protect,
        name: category.name,
        surface: 'WEB',
        description: `${category.label}${postSuffix(count)}`,
        notes: 'XREF',
        href: count ? `${baseUrl}web/${category.slug}/` : `${baseUrl}unmapped/${category.slug}/`,
      };
    }));
  } else {
    addSimpleSection({ id: 'web', type: 'MAP', protect: 'ER--', name: '.web', surface: 'WEB', description: 'Web security', notes: 'XREF', state: 'UNMAPPED', href: `${baseUrl}unmapped/web/` }, PAGE_SIZE);
  }

  const windowsDefinitions = [
    { id: 'windows-um', type: 'MAP', protect: 'ER--', name: '.windows.um', surface: 'WINDOWS', description: `User-mode code${postSuffix(groupedPosts.get('windows-um')?.length ?? 0)}`, notes: 'XREF', href: (groupedPosts.get('windows-um')?.length ?? 0) ? `${baseUrl}windows/user-mode/` : `${baseUrl}unmapped/windows-um/` },
    { id: 'windows-km', type: 'MAP', protect: 'ER--', name: '.windows.km', surface: 'WINDOWS', description: `Kernel and drivers${postSuffix(groupedPosts.get('windows-km')?.length ?? 0)}`, notes: 'XREF', href: (groupedPosts.get('windows-km')?.length ?? 0) ? `${baseUrl}windows/kernel/` : `${baseUrl}unmapped/windows-km/` },
  ];
  const windowsPostCount = windowsDefinitions.reduce((total, definition) => total + (groupedPosts.get(definition.id)?.length ?? 0), 0);
  if (windowsPostCount) {
    addNestedSection({ id: 'windows', type: 'IMG', protect: 'ER--', name: '.windows', surface: 'WINDOWS', description: `Windows internals${postSuffix(windowsPostCount)}`, notes: 'XREF', state: 'MAPPED' }, windowsDefinitions);
  } else {
    addSimpleSection({ id: 'windows', type: 'IMG', protect: 'ER--', name: '.windows', surface: 'WINDOWS', description: 'Windows internals', notes: 'XREF', state: 'UNMAPPED', href: `${baseUrl}unmapped/windows/` }, PAGE_SIZE);
  }

  const regionById = new Map(regions.map((region) => [region.id, region]));
  Object.values(postAllocations).forEach((allocation) => {
    const region = regionById.get(allocation.regionId);
    if (!region || !allocation.contentAddress) throw new Error(`Post ${allocation.slug} has no mapped content address`);
    allocation.regionName = region.name;
    const regionBase = Number.parseInt(region.base, 16);
    const regionEnd = regionBase + Number.parseInt(region.size, 16);
    if (allocation.contentAddress < regionBase || allocation.contentAddress + allocation.byteLength > regionEnd) {
      throw new Error(`Post ${allocation.slug} exceeds ${region.name}`);
    }
    if (allocation.indexAddress < data.numericBase || allocation.indexAddress + allocation.indexByteLength > data.numericBase + data.numericSize) {
      throw new Error(`Index record for ${allocation.slug} exceeds .data`);
    }
  });

  regions.filter((region) => region.parentId).forEach((region) => {
    const parent = regionById.get(region.parentId!);
    if (!parent) throw new Error(`Region ${region.id} has no parent`);
    const base = Number.parseInt(region.base, 16);
    const end = base + Number.parseInt(region.size, 16);
    const parentBase = Number.parseInt(parent.base, 16);
    const parentEnd = parentBase + Number.parseInt(parent.size, 16);
    if (base < parentBase || end > parentEnd) throw new Error(`Region ${region.id} exceeds ${parent.name}`);
  });

  return { regions, mapStart: IMAGE_BASE, mapEnd: cursor, postAllocations, profileAllocations, projectAllocations };
}
