# ======================
#  Build Configuration
# ======================
PARAMS_HEAD = 128s
THASH = simple

PARAMS := sphincs-SM3-$(PARAMS_HEAD)

# ================
#  Include Paths
# ================
INCLUDE_DIR    = include
INCLUDE_SUBDIRS = hash signature params utils
INCLUDE_FLAGS  = -I$(INCLUDE_DIR) $(addprefix -I$(INCLUDE_DIR)/, $(INCLUDE_SUBDIRS)) \
                 -I/usr/include/cjson \

# ================
#  Compiler Setup
# ================
CC      = gcc
CFLAGS  = -fPIC -std=c99 -O3 -Wall -Wextra -Wpedantic -pthread \
          -DPARAMS=$(PARAMS) $(INCLUDE_FLAGS)
LDFLAGS = -shared
LDLIBS  = -lcrypto

# ================
#  Source Files
# ================
BASE_SRCDIR = src

# -- Core SPHINCS+ Components --
CORE_SOURCES = $(BASE_SRCDIR)/signature/address.c \
               $(BASE_SRCDIR)/signature/merkle.c \
               $(BASE_SRCDIR)/signature/wots.c \
               $(BASE_SRCDIR)/signature/wotsx1.c \
               $(BASE_SRCDIR)/signature/fors.c \
               $(BASE_SRCDIR)/signature/TSS_sign.c

# -- Utility Components --
UTIL_SOURCES = $(BASE_SRCDIR)/utils/utils.c \
               $(BASE_SRCDIR)/utils/utilsx1.c \
               $(BASE_SRCDIR)/utils/randombytes.c

# -- Hash --
HASH_SOURCES = $(BASE_SRCDIR)/hash/SM3.c \
               $(BASE_SRCDIR)/hash/hash_SM3.c \
               $(BASE_SRCDIR)/hash/thash_SM3_$(THASH).c

# -- API Interfaces --
API_SOURCES = api/keygenAPI.c api/signAPI.c

# -- All Sources --
SOURCES = $(CORE_SOURCES) $(UTIL_SOURCES) $(HASH_SOURCES) $(API_SOURCES)

# ================
#  Build Targets
# ================
TARGET = libspx.so

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $^ $(LDLIBS)

clean:
	$(RM) $(TARGET)

# cd spxlibAPI
# make
# cp libspx.so ../src/backend/
