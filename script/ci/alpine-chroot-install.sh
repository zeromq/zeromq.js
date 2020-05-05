#!/bin/bash
# https://github.com/alpinelinux/alpine-chroot-install/blob/master/alpine-chroot-install
# vim: set ts=4:
#---help---
# Usage: alpine-chroot-install [options]
#
# This script installs Alpine Linux into a chroot and optionally sets up
# qemu-user and binfmt to emulate different architecture (e.g. armhf).
#
# If qemu-user and binfmt is needed, the script checks if both are available
# and qemu-user has version >= 2.6. If not, it tries to install them using
# apt-get. Beside this the script should work on any Linux system.
#
# It also creates script "enter-chroot" inside the chroot directory, that may
# be used to enter the chroot environment. That script do the following:
#
#   1. saves environment variables specified by $CHROOT_KEEP_VARS and PWD,
#   2. chroots into $CHROOT_DIR,
#   3. starts clean environment using "env -i",
#   4. switches user and simulates full login using "su -l",
#   5. loads saved environment variables and changes directory to saved PWD,
#   6. executes specified command or "sh" if not provided.
#
# Example:
#   sudo alpine-chroot-install -d /alpine -p build-base -p cmake
#	/alpine/enter-chroot -u $USER ./build
#
# Options and environment variables:
#   -a ARCH                CPU architecture for the chroot. If not set, then it's
#                          the same as the host's architecture. If it's different
#                          from the host's architecture, then it will be emulated
#                          using qemu-user. Options: x86_64, x86, aarch64, armhf,
#                          ppc64le, s390x.
#
#   -b ALPINE_BRANCH       Alpine branch to install (default is v3.8).
#
#   -d CHROOT_DIR          Absolute path to the directory where Alpine chroot
#                          should be installed (default is /alpine).
#
#   -i BIND_DIR            Absolute path to the directory on the host system that
#                          should be mounted on the same path inside the chroot
#                          (default is PWD, if it's under /home, or none).
#
#   -k CHROOT_KEEP_VARS... Names of the environment variables to pass from the
#                          host environment into chroot by the enter-chroot
#                          script. Name may be an extended regular expression.
#                          Default: ARCH CI QEMU_EMULATOR TRAVIS_.*.
#
#   -m ALPINE_MIRROR...    URI of the Aports mirror to fetch packages from
#                          (default is https://nl.alpinelinux.org/alpine).
#
#   -p ALPINE_PACKAGES...  Alpine packages to install into the chroot (default is
#                          build-base ca-certificates ssl_client).
#
#   -r EXTRA_REPOS...      Alpine repositories to be added to
#                          /etc/apk/repositories (main and community from
#                          $ALPINE_MIRROR are always added).
#
#   -t TEMP_DIR            Absolute path to the directory where to store temporary
#                          files (default is /tmp/alpine).
#
#   -h                     Show this help message and exit.
#
#   -v                     Print version and exit.
#
#   APK_TOOLS_URI          URL of static apk-tools tarball to download.
#                          Default is x86_64 apk-tools from
#                          https://github.com/alpinelinux/apk-tools/releases.
#
#   APK_TOOLS_SHA256       SHA-256 checksum of $APK_TOOLS_URI.
#
# Each option can be also provided by environment variable. If both option and
# variable is specified and the option accepts only one argument, then the
# option takes precedence.
#
# https://github.com/alpinelinux/alpine-chroot-install
#---help---
set -eu

#=======================  C o n s t a n t s  =======================#

: ${APK_TOOLS_URI:="https://github.com/alpinelinux/apk-tools/releases/download/v2.10.0/apk-tools-2.10.0-x86_64-linux.tar.gz"}
: ${APK_TOOLS_SHA256:="77f2d256fcd5d6fdafadf43bb6a9c85c3da7bb471ee842dcd729175235cb9fed"}

# Alpine APK keys for packages verification.
ALPINE_KEYS='
4a6a0840:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1yHJxQgsHQREclQu4Ohe\nqxTxd1tHcNnvnQTu/UrTky8wWvgXT+jpveroeWWnzmsYlDI93eLI2ORakxb3gA2O\nQ0Ry4ws8vhaxLQGC74uQR5+/yYrLuTKydFzuPaS1dK19qJPXB8GMdmFOijnXX4SA\njixuHLe1WW7kZVtjL7nufvpXkWBGjsfrvskdNA/5MfxAeBbqPgaq0QMEfxMAn6/R\nL5kNepi/Vr4S39Xvf2DzWkTLEK8pcnjNkt9/aafhWqFVW7m3HCAII6h/qlQNQKSo\nGuH34Q8GsFG30izUENV9avY7hSLq7nggsvknlNBZtFUcmGoQrtx3FmyYsIC8/R+B\nywIDAQAB
5243ef4b:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvNijDxJ8kloskKQpJdx+\nmTMVFFUGDoDCbulnhZMJoKNkSuZOzBoFC94omYPtxnIcBdWBGnrm6ncbKRlR+6oy\nDO0W7c44uHKCFGFqBhDasdI4RCYP+fcIX/lyMh6MLbOxqS22TwSLhCVjTyJeeH7K\naA7vqk+QSsF4TGbYzQDDpg7+6aAcNzg6InNePaywA6hbT0JXbxnDWsB+2/LLSF2G\nmnhJlJrWB1WGjkz23ONIWk85W4S0XB/ewDefd4Ly/zyIciastA7Zqnh7p3Ody6Q0\nsS2MJzo7p3os1smGjUF158s6m/JbVh4DN6YIsxwl2OjDOz9R0OycfJSDaBVIGZzg\ncQIDAQAB
524d27bb:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr8s1q88XpuJWLCZALdKj\nlN8wg2ePB2T9aIcaxryYE/Jkmtu+ZQ5zKq6BT3y/udt5jAsMrhHTwroOjIsF9DeG\ne8Y3vjz+Hh4L8a7hZDaw8jy3CPag47L7nsZFwQOIo2Cl1SnzUc6/owoyjRU7ab0p\niWG5HK8IfiybRbZxnEbNAfT4R53hyI6z5FhyXGS2Ld8zCoU/R4E1P0CUuXKEN4p0\n64dyeUoOLXEWHjgKiU1mElIQj3k/IF02W89gDj285YgwqA49deLUM7QOd53QLnx+\nxrIrPv3A+eyXMFgexNwCKQU9ZdmWa00MjjHlegSGK8Y2NPnRoXhzqSP9T9i2HiXL\nVQIDAQAB
5261cecb:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwlzMkl7b5PBdfMzGdCT0\ncGloRr5xGgVmsdq5EtJvFkFAiN8Ac9MCFy/vAFmS8/7ZaGOXoCDWbYVLTLOO2qtX\nyHRl+7fJVh2N6qrDDFPmdgCi8NaE+3rITWXGrrQ1spJ0B6HIzTDNEjRKnD4xyg4j\ng01FMcJTU6E+V2JBY45CKN9dWr1JDM/nei/Pf0byBJlMp/mSSfjodykmz4Oe13xB\nCa1WTwgFykKYthoLGYrmo+LKIGpMoeEbY1kuUe04UiDe47l6Oggwnl+8XD1MeRWY\nsWgj8sF4dTcSfCMavK4zHRFFQbGp/YFJ/Ww6U9lA3Vq0wyEI6MCMQnoSMFwrbgZw\nwwIDAQAB
58199dcc:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3v8/ye/V/t5xf4JiXLXa\nhWFRozsnmn3hobON20GdmkrzKzO/eUqPOKTpg2GtvBhK30fu5oY5uN2ORiv2Y2ht\neLiZ9HVz3XP8Fm9frha60B7KNu66FO5P2o3i+E+DWTPqqPcCG6t4Znk2BypILcit\nwiPKTsgbBQR2qo/cO01eLLdt6oOzAaF94NH0656kvRewdo6HG4urbO46tCAizvCR\nCA7KGFMyad8WdKkTjxh8YLDLoOCtoZmXmQAiwfRe9pKXRH/XXGop8SYptLqyVVQ+\ntegOD9wRs2tOlgcLx4F/uMzHN7uoho6okBPiifRX+Pf38Vx+ozXh056tjmdZkCaV\naQIDAQAB
58cbb476:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoSPnuAGKtRIS5fEgYPXD\n8pSGvKAmIv3A08LBViDUe+YwhilSHbYXUEAcSH1KZvOo1WT1x2FNEPBEFEFU1Eyc\n+qGzbA03UFgBNvArurHQ5Z/GngGqE7IarSQFSoqewYRtFSfp+TL9CUNBvM0rT7vz\n2eMu3/wWG+CBmb92lkmyWwC1WSWFKO3x8w+Br2IFWvAZqHRt8oiG5QtYvcZL6jym\nY8T6sgdDlj+Y+wWaLHs9Fc+7vBuyK9C4O1ORdMPW15qVSl4Lc2Wu1QVwRiKnmA+c\nDsH/m7kDNRHM7TjWnuj+nrBOKAHzYquiu5iB3Qmx+0gwnrSVf27Arc3ozUmmJbLj\nzQIDAQAB
58e4f17d:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvBxJN9ErBgdRcPr5g4hV\nqyUSGZEKuvQliq2Z9SRHLh2J43+EdB6A+yzVvLnzcHVpBJ+BZ9RV30EM9guck9sh\nr+bryZcRHyjG2wiIEoduxF2a8KeWeQH7QlpwGhuobo1+gA8L0AGImiA6UP3LOirl\nI0G2+iaKZowME8/tydww4jx5vG132JCOScMjTalRsYZYJcjFbebQQolpqRaGB4iG\nWqhytWQGWuKiB1A22wjmIYf3t96l1Mp+FmM2URPxD1gk/BIBnX7ew+2gWppXOK9j\n1BJpo0/HaX5XoZ/uMqISAAtgHZAqq+g3IUPouxTphgYQRTRYpz2COw3NF43VYQrR\nbQIDAQAB'

# Minimal required version of QEMU emulator.
QEMU_MIN_VER='2.6'

# Name of Ubuntu release to install qemu-user-static from if package for
# the host system is older than $QEMU_MIN_VER.
QEMU_UBUNTU_REL='artful'

# Version of alpine-chroot-install script.
VERSION='0.9.0'


#=======================  F u n c t i o n s  =======================#

die() {
	printf '\033[1;31mERROR:\033[0m %s\n' "$@" >&2  # bold red
	exit 1
}

einfo() {
	printf '\n\033[1;36m> %s\033[0m\n' "$@" >&2  # bold cyan
}

ewarn() {
	printf '\033[1;33m> %s\033[0m\n' "$@" >&2  # bold yellow
}

# Writes Alpine APK keys embedded in this script into directory $1.
dump_alpine_keys() {
	local dest_dir="$1"
	local content id line

	mkdir -p "$dest_dir"
	for line in $ALPINE_KEYS; do
		id=${line%%:*}
		content=${line#*:}

		printf -- "-----BEGIN PUBLIC KEY-----\n$content\n-----END PUBLIC KEY-----\n" \
			> "$dest_dir/alpine-devel@lists.alpinelinux.org-$id.rsa.pub"
	done
}

normalize_arch() {
	case "$1" in
		x86 | i[3456]86) echo 'i386';;
		armhf | armv[4-9]) echo 'arm';;
		*) echo "$1";;
	esac
}

wgets() (
	local url="$1"
	local sha256="$2"
	local dest="${3:-.}"

	mkdir -p "$dest" \
		&& cd "$dest" \
		&& rm -f "${url##*/}" \
		&& wget -T 10 --no-verbose "$url" \
		&& echo "$sha256  ${url##*/}" | sha256sum -c
)

usage() {
	sed -En '/^#---help---/,/^#---help---/p' "$0" | sed -E 's/^# ?//; 1d;$d;'
}

gen_chroot_script() {
	cat <<-EOF
		#!/bin/sh
		set -e

		ENV_FILTER_REGEX='($(echo "$CHROOT_KEEP_VARS" | tr -s ' ' '|'))'
	EOF
	if [ -n "$QEMU_EMULATOR" ]; then
		printf 'export QEMU_EMULATOR="%s"' "$QEMU_EMULATOR"
	fi
	cat <<-'EOF'

		user='root'
		if [ $# -ge 2 ] && [ "$1" = '-u' ]; then
		    user="$2"; shift 2
		fi
		oldpwd="$(pwd)"
		[ "$(id -u)" -eq 0 ] || _sudo='sudo'

		tmpfile="$(mktemp)"
		chmod 644 "$tmpfile"
		export | sed -En "s/^([^=]+ ${ENV_FILTER_REGEX}=)('.*'|\".*\")$/\1\3/p" > "$tmpfile" || true

		cd "$(dirname "$0")"
		$_sudo mv "$tmpfile" env.sh
		$_sudo chroot . /usr/bin/env -i su -l "$user" \
		    sh -c ". /etc/profile; . /env.sh; cd '$oldpwd' 2>/dev/null; \"\$@\"" \
		    -- "${@:-sh}"
	EOF
	# NOTE: ash does not load login profile when run with QEMU user-mode
	# emulation (I have no clue why), that's why /etc/profile is sourced here.
}

#------------------------- Debian/Ubuntu ---------------------------#

alias cmp_versions='dpkg --compare-versions'
alias apt_install='apt-get install -y --no-install-recommends'

# Adds repository of the specified Ubuntu release to the sources list
# and pins it with priority -1.
# $1: ubuntu release name
add_ubuntu_repo() {
	local release="$1"
	local source_list="/etc/apt/sources.list.d/ubuntu-$release.list"

	echo "deb http://archive.ubuntu.com/ubuntu $release main universe" >> $source_list
	cat >> /etc/apt/preferences.d/ubuntu-$release <<-EOF
		Package: *
		Pin: release n=$release
		Pin-Priority: -1
	EOF

	apt-get -q update -o Dir::Etc::sourcelist="$source_list"
}

# Prints version of the specified APT package that would be installed.
# $1: package name
apt_pkgver() {
	apt-cache policy "$1" | sed -En 's/^\s*Candidate:( [0-9]+:| )(\S+).*/\2/p'
}

# Prints version of the given QEMU binary.
# $1: qemu binary
qemu_version() {
	"$1" --version | sed -En 's/^.*version ([0-9.]+).*/\1/p'
}

# Installs and enables binfmt-support on Debian/Ubuntu host.
install_binfmt_support() {
	apt_install binfmt-support \
		|| die 'Failed to install binfmt-support using apt-get!'

	update-binfmts --enable \
		|| die 'Failed to enable binfmt!'
}

# Installs QEMU user mode emulation binaries on Debian/Ubuntu host.
install_qemu_user() {
	local target_rel=''
	local qemu_ver=$(apt_pkgver qemu-user-static)

	if ! cmp_versions "$qemu_ver" ge "$QEMU_MIN_VER"; then
		ewarn "Package qemu-user-static available for your system is too old ($qemu_ver)"
		ewarn "Installing newer version from repository of ubuntu $QEMU_UBUNTU_REL..."

		add_ubuntu_repo $QEMU_UBUNTU_REL \
			|| die "Failed to add repository of ubuntu $QEMU_UBUNTU_REL!"

		target_rel="--target-release $QEMU_UBUNTU_REL"
	fi

	apt_install $target_rel qemu-user-static \
		|| die 'Failed to install qemu-user-static using apt-get!'
}


#============================  M a i n  ============================#

while getopts 'a:b:d:i:k:m:p:r:t:hv' OPTION; do
	case "$OPTION" in
		a) ARCH="$OPTARG";;
		b) ALPINE_BRANCH="$OPTARG";;
		d) CHROOT_DIR="$OPTARG";;
		i) BIND_DIR="$OPTARG";;
		k) CHROOT_KEEP_VARS="${CHROOT_KEEP_VARS:-} $OPTARG";;
		m) ALPINE_MIRROR="$OPTARG";;
		p) ALPINE_PACKAGES="${ALPINE_PACKAGES:-} $OPTARG";;
		r) EXTRA_REPOS="${EXTRA_REPOS:-} $OPTARG";;
		t) TEMP_DIR="$OPTARG";;
		h) usage; exit 0;;
		v) echo "alpine-chroot-install $VERSION"; exit 0;;
	esac
done

: ${ALPINE_BRANCH:="v3.8"}
: ${ALPINE_MIRROR:="https://nl.alpinelinux.org/alpine"}
: ${ALPINE_PACKAGES:="build-base ca-certificates ssl_client"}
: ${ARCH:=}
: ${BIND_DIR:=}
: ${CHROOT_DIR:="/alpine"}
: ${CHROOT_KEEP_VARS:="ARCH CI QEMU_EMULATOR TRAVIS_.*"}
: ${EXTRA_REPOS:=}
: ${TEMP_DIR:="/tmp/alpine"}

# Note: Binding $PWD into chroot as default was a bad idea. It's convenient
# on Travis, but dangerous in general. However, all existing .travis.yml relies
# on this behaviour, so we can't (shouldn't) remove it completely.
[ "$BIND_DIR" ] || case "$(pwd)" in
	/home/*) BIND_DIR="$(pwd)";;
esac


if [ "$(id -u)" -ne 0 ]; then
	die 'This script must be run as root!'
fi

mkdir -p "$CHROOT_DIR"
cd "$CHROOT_DIR"


# Install QEMU user mode emulation if needed

QEMU_EMULATOR=''
if [ -n "$ARCH" ] && [ $(normalize_arch $ARCH) != $(normalize_arch $(uname -m)) ]; then
	qemu_arch="$(normalize_arch $ARCH)"
	QEMU_EMULATOR="/usr/bin/qemu-$qemu_arch-static"

	if [ ! -x "$QEMU_EMULATOR" ]; then
		einfo 'Installing qemu-user-static on host system...'
		install_qemu_user

	elif ! cmp_versions "$(qemu_version $QEMU_EMULATOR)" ge $QEMU_MIN_VER; then
		ver=$(qemu_version $QEMU_EMULATOR)
		ewarn "${QEMU_EMULATOR##*/} on host system is too old ($ver), minimal required version is $QEMU_MIN_VER"
		ewarn 'Installing newer version...'
		install_qemu_user
	fi

	if [ ! -e /proc/sys/fs/binfmt_misc/qemu-$qemu_arch ]; then
		einfo 'Installing and enabling binfmt-support on host system...'
		install_binfmt_support
	fi

	mkdir -p usr/bin
	cp -v "$QEMU_EMULATOR" usr/bin/
fi


einfo 'Downloading static apk-tools'

wgets "$APK_TOOLS_URI" "$APK_TOOLS_SHA256" "$TEMP_DIR"
tar -C "$TEMP_DIR" -xzf "$TEMP_DIR/${APK_TOOLS_URI##*/}"
mv "$TEMP_DIR"/apk-tools-*/apk "$TEMP_DIR"/


einfo "Installing Alpine Linux $ALPINE_BRANCH ($ARCH) into chroot"

mkdir -p "$CHROOT_DIR"/etc/apk
cd "$CHROOT_DIR"

printf '%s\n' \
	"$ALPINE_MIRROR/$ALPINE_BRANCH/main" \
	"$ALPINE_MIRROR/$ALPINE_BRANCH/community" \
	$EXTRA_REPOS \
	> etc/apk/repositories

dump_alpine_keys etc/apk/keys/

cp /etc/resolv.conf etc/resolv.conf

"$TEMP_DIR"/apk \
	--root . --update-cache --initdb --no-progress \
	${ARCH:+--arch $ARCH} \
	add alpine-base

gen_chroot_script > enter-chroot
chmod +x enter-chroot


einfo 'Binding filesystems into chroot'

mount -v -t proc none proc
mount -v --rbind /sys sys
mount -v --rbind /dev dev
mount -v --rbind /run run

if [ "$BIND_DIR" ]; then
	mkdir -p "${CHROOT_DIR}${BIND_DIR}"
	mount -v --bind "$BIND_DIR" "${CHROOT_DIR}${BIND_DIR}"
fi


einfo 'Setting up Alpine'

./enter-chroot <<-EOF
	set -e
	apk update
	apk add $ALPINE_PACKAGES

	if [ -d /etc/sudoers.d ] && [ ! -e /etc/sudoers.d/wheel ]; then
		echo '%wheel ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/wheel
	fi

	if [ -n "${SUDO_USER:-}" ]; then
		adduser -u "${SUDO_UID:-1000}" -G users -s /bin/sh -D "${SUDO_USER:-}" || true
	fi
EOF

cat >&2 <<-EOF
	---
	Alpine installation is complete
	Run $CHROOT_DIR/enter-chroot [-u <user>] [command] to enter the chroot.
EOF
