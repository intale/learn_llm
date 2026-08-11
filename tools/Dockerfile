FROM mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48

ARG TOOLCHAIN_LOCK_SHA256=unrecorded
ARG TOOLS_SOURCE_SHA256=unrecorded

LABEL org.opencontainers.image.title="learn-llm-agent-tools" \
      org.opencontainers.image.description="Offline Codex validation utilities" \
      org.opencontainers.image.base.name="mcr.microsoft.com/playwright:v1.61.1-noble" \
      org.opencontainers.image.base.digest="sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48" \
      org.learn-llm.ubuntu.snapshot="20260811T091000Z" \
      org.learn-llm.toolchain-lock-sha256="${TOOLCHAIN_LOCK_SHA256}" \
      org.learn-llm.tools-source-sha256="${TOOLS_SOURCE_SHA256}"

WORKDIR /opt/learn-llm-agent-tools

COPY toolchain.lock.json ./

# The Playwright image includes moving Ubuntu and NodeSource sources. Replace
# all of them with the signed, immutable Ubuntu 24.04 snapshot transaction.
RUN set -eux; \
    node -e 'const fs=require("fs"); const lock=JSON.parse(fs.readFileSync("toolchain.lock.json","utf8")); const actual={meta:[lock.schema_version,lock.tool],base:[lock.base_image.reference,lock.base_image.digest,lock.base_image.platform,lock.base_image.overrideable_at_build],ubuntu:[lock.ubuntu.snapshot_id,lock.ubuntu.suite,lock.ubuntu.architecture,lock.ubuntu.overrideable_at_build,lock.ubuntu.sources],apt:[lock.apt.no_recommends,lock.apt.no_upgrade,lock.apt.remove_nodesource_repository,lock.apt.enforce_exact_new_package_set,lock.apt.verify_each_installed_version,lock.apt.roots.map(x=>x.name),lock.apt.omitted_roots,lock.apt.packages.map(x=>[x.name,x.version])],attestation:lock.attestation}; const expected={meta:[1,"learn-llm-agent-tools"],base:["mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48","sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48","linux/amd64",false],ubuntu:["20260811T091000Z","noble","amd64",false,[{type:"deb",uri:"https://snapshot.ubuntu.com/ubuntu/20260811T091000Z/",suites:["noble","noble-updates","noble-backports"],components:["main","restricted","universe","multiverse"],architectures:["amd64"],signed_by:"/usr/share/keyrings/ubuntu-archive-keyring.gpg"},{type:"deb",uri:"https://snapshot.ubuntu.com/ubuntu/20260811T091000Z/",suites:["noble-security"],components:["main","restricted","universe","multiverse"],architectures:["amd64"],signed_by:"/usr/share/keyrings/ubuntu-archive-keyring.gpg"}]],apt:[true,true,true,true,true,["imagemagick","unzip","fonts-dejavu-core"],["jq"],[["fonts-dejavu-core","2.37-8"],["fonts-dejavu-mono","2.37-8"],["imagemagick","8:6.9.12.98+dfsg1-5.2build2"],["imagemagick-6-common","8:6.9.12.98+dfsg1-5.2build2"],["imagemagick-6.q16","8:6.9.12.98+dfsg1-5.2build2"],["libheif-plugin-aomdec","1.17.6-1ubuntu4.6"],["libheif1","1.17.6-1ubuntu4.6"],["liblqr-1-0","0.4.2-2.1build2"],["libltdl7","2.4.7-7build1"],["libmagickcore-6.q16-7t64","8:6.9.12.98+dfsg1-5.2build2"],["libmagickwand-6.q16-7t64","8:6.9.12.98+dfsg1-5.2build2"],["libraw23t64","0.21.2-2.1ubuntu0.24.04.2"],["unzip","6.0-28ubuntu4.1"]]],attestation:{copied_lock_hash_verified_during_build:true,copied_source_set_hash_verified_during_build:true,unrecorded_hashes_rejected:true}}; if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error("toolchain lock does not match Dockerfile execution inputs");'; \
    dpkg-query -W -f='${Package} ${Status}\n' \
      | awk '$2 == "install" && $3 == "ok" && $4 == "installed" { print $1 }' \
      | LC_ALL=C sort -u > /tmp/packages.before; \
    rm -f /etc/apt/sources.list; \
    find /etc/apt/sources.list.d -maxdepth 1 -type f -delete; \
    printf '%s\n' \
      'Types: deb' \
      'URIs: https://snapshot.ubuntu.com/ubuntu/20260811T091000Z/' \
      'Suites: noble noble-updates noble-backports' \
      'Components: main restricted universe multiverse' \
      'Architectures: amd64' \
      'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg' \
      '' \
      'Types: deb' \
      'URIs: https://snapshot.ubuntu.com/ubuntu/20260811T091000Z/' \
      'Suites: noble-security' \
      'Components: main restricted universe multiverse' \
      'Architectures: amd64' \
      'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg' \
      > /etc/apt/sources.list.d/ubuntu.sources; \
    apt-get -o Acquire::Check-Valid-Until=false update; \
    apt-get install -y --no-install-recommends --no-upgrade \
      'fonts-dejavu-core=2.37-8' \
      'fonts-dejavu-mono=2.37-8' \
      'imagemagick-6-common=8:6.9.12.98+dfsg1-5.2build2' \
      'imagemagick-6.q16=8:6.9.12.98+dfsg1-5.2build2' \
      'imagemagick=8:6.9.12.98+dfsg1-5.2build2' \
      'libheif-plugin-aomdec=1.17.6-1ubuntu4.6' \
      'libheif1=1.17.6-1ubuntu4.6' \
      'liblqr-1-0=0.4.2-2.1build2' \
      'libltdl7=2.4.7-7build1' \
      'libmagickcore-6.q16-7t64=8:6.9.12.98+dfsg1-5.2build2' \
      'libmagickwand-6.q16-7t64=8:6.9.12.98+dfsg1-5.2build2' \
      'libraw23t64=0.21.2-2.1ubuntu0.24.04.2' \
      'unzip=6.0-28ubuntu4.1'; \
    printf '%s\n' \
      'fonts-dejavu-core' \
      'fonts-dejavu-mono' \
      'imagemagick' \
      'imagemagick-6-common' \
      'imagemagick-6.q16' \
      'libheif-plugin-aomdec' \
      'libheif1' \
      'liblqr-1-0' \
      'libltdl7' \
      'libmagickcore-6.q16-7t64' \
      'libmagickwand-6.q16-7t64' \
      'libraw23t64' \
      'unzip' \
      | LC_ALL=C sort > /tmp/packages.expected; \
    dpkg-query -W -f='${Package} ${Status}\n' \
      | awk '$2 == "install" && $3 == "ok" && $4 == "installed" { print $1 }' \
      | LC_ALL=C sort -u > /tmp/packages.after; \
    comm -13 /tmp/packages.before /tmp/packages.after > /tmp/packages.added; \
    comm -23 /tmp/packages.before /tmp/packages.after > /tmp/packages.removed; \
    cmp /tmp/packages.expected /tmp/packages.added; \
    test ! -s /tmp/packages.removed; \
    for package_version in \
      'fonts-dejavu-core=2.37-8' \
      'fonts-dejavu-mono=2.37-8' \
      'imagemagick-6-common=8:6.9.12.98+dfsg1-5.2build2' \
      'imagemagick-6.q16=8:6.9.12.98+dfsg1-5.2build2' \
      'imagemagick=8:6.9.12.98+dfsg1-5.2build2' \
      'libheif-plugin-aomdec=1.17.6-1ubuntu4.6' \
      'libheif1=1.17.6-1ubuntu4.6' \
      'liblqr-1-0=0.4.2-2.1build2' \
      'libltdl7=2.4.7-7build1' \
      'libmagickcore-6.q16-7t64=8:6.9.12.98+dfsg1-5.2build2' \
      'libmagickwand-6.q16-7t64=8:6.9.12.98+dfsg1-5.2build2' \
      'libraw23t64=0.21.2-2.1ubuntu0.24.04.2' \
      'unzip=6.0-28ubuntu4.1'; do \
      package=${package_version%%=*}; version=${package_version#*=}; \
      test "$(dpkg-query -W -f='${Version}' "$package")" = "$version"; \
    done; \
    rm -rf /var/lib/apt/lists/* /tmp/packages.before /tmp/packages.after \
      /tmp/packages.expected /tmp/packages.added /tmp/packages.removed

COPY Dockerfile ./Dockerfile
COPY luna/ ./luna/
COPY terra/ ./terra/
COPY tests/ ./tests/

RUN set -eux; \
    test "$TOOLCHAIN_LOCK_SHA256" != unrecorded; \
    test "$TOOLS_SOURCE_SHA256" != unrecorded; \
    test "$(sha256sum -- toolchain.lock.json | awk '{print $1}')" = "$TOOLCHAIN_LOCK_SHA256"; \
    test "$(sha256sum -- Dockerfile luna/verify-run.mjs terra/visual-evidence.mjs tests/docker tests/verify-run.test.mjs tests/visual-evidence.test.mjs | sha256sum | awk '{print $1}')" = "$TOOLS_SOURCE_SHA256"; \
    test -x tests/docker; \
    node --check luna/verify-run.mjs \
 && node --check terra/visual-evidence.mjs \
 && node --check tests/verify-run.test.mjs \
 && node --check tests/visual-evidence.test.mjs
