// User-friendly formatters for DigitalOcean droplet data

// Region slug to friendly name mapping
const regionNames: Record<string, string> = {
  // North America
  'nyc1': 'New York 1',
  'nyc2': 'New York 2',
  'nyc3': 'New York 3',
  'sfo1': 'San Francisco 1',
  'sfo2': 'San Francisco 2',
  'sfo3': 'San Francisco 3',
  'tor1': 'Toronto 1',
  // Europe
  'ams2': 'Amsterdam 2',
  'ams3': 'Amsterdam 3',
  'lon1': 'London 1',
  'fra1': 'Frankfurt 1',
  // Asia Pacific
  'sgp1': 'Singapore 1',
  'blr1': 'Bangalore 1',
  'syd1': 'Sydney 1',
};

// Image slug to friendly name mapping
const imageNames: Record<string, string> = {
  // Ubuntu
  'ubuntu-24-04-x64': 'Ubuntu 24.04 LTS',
  'ubuntu-22-04-x64': 'Ubuntu 22.04 LTS',
  'ubuntu-20-04-x64': 'Ubuntu 20.04 LTS',
  'ubuntu-24-10-x64': 'Ubuntu 24.10',
  // Debian
  'debian-12-x64': 'Debian 12',
  'debian-11-x64': 'Debian 11',
  'debian-10-x64': 'Debian 10',
  // CentOS
  'centos-stream-9-x64': 'CentOS Stream 9',
  'centos-stream-8-x64': 'CentOS Stream 8',
  'centos-7-x64': 'CentOS 7',
  // Fedora
  'fedora-40-x64': 'Fedora 40',
  'fedora-39-x64': 'Fedora 39',
  // Rocky Linux
  'rockylinux-9-x64': 'Rocky Linux 9',
  'rockylinux-8-x64': 'Rocky Linux 8',
  // AlmaLinux
  'almalinux-9-x64': 'AlmaLinux 9',
  'almalinux-8-x64': 'AlmaLinux 8',
  // FreeBSD
  'freebsd-14-x64': 'FreeBSD 14',
  'freebsd-13-x64': 'FreeBSD 13',
};

export function formatRegion(slug: string): string {
  return regionNames[slug] || slug.toUpperCase().replace(/-/g, ' ');
}

export function formatSize(slug: string): string {
  // Parse size slug like 's-1vcpu-1gb', 's-2vcpu-2gb', 's-4vcpu-8gb', etc.
  const match = slug.match(/s-(\d+)vcpu-(\d+)(gb|mb)/i);
  if (match) {
    const vcpus = match[1];
    const memory = match[2];
    const unit = match[3].toUpperCase();
    return `${vcpus} vCPU • ${memory} ${unit} RAM`;
  }
  
  // Try to parse other formats like 'c-2', 'm-2vcpu-16gb', etc.
  const cpuMatch = slug.match(/(\d+)vcpu/i);
  const memMatch = slug.match(/(\d+)(gb|mb)/i);
  
  if (cpuMatch && memMatch) {
    return `${cpuMatch[1]} vCPU • ${memMatch[1]} ${memMatch[2].toUpperCase()} RAM`;
  }
  
  // Return original if can't parse
  return slug;
}

export function formatImage(slug: string): string {
  // Check exact match first
  if (imageNames[slug]) {
    return imageNames[slug];
  }
  
  // Try to parse the image slug
  // Format is usually: distribution-version-arch
  const parts = slug.split('-');
  if (parts.length >= 2) {
    const distro = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const version = parts.slice(1, -1).join('.');
    return `${distro} ${version}`.replace('X64', '').trim();
  }
  
  return slug;
}
