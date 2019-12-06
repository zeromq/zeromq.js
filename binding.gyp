{
  'variables': {
    'zmq_shared%': 'false',
    'zmq_draft%': 'false',
    'zmq_no_sync_resolve%': 'false',
  },

  'targets': [
    {
      'target_name': 'libzmq',
      'type': 'none',

      'conditions': [
        ["zmq_shared == 'false'", {
          'actions': [{
            'action_name': 'build_libzmq',
            'inputs': ['package.json'],
            'outputs': ['libzmq/lib'],
            'action': ['sh', '<(PRODUCT_DIR)/../../script/build.sh'],
          }],
        }],
      ],
    },

    {
      'target_name': 'zeromq',
      'dependencies': ['libzmq'],
      'sources': [
        'src/context.cc',
        'src/incoming_msg.cc',
        'src/module.cc',
        'src/observer.cc',
        'src/outgoing_msg.cc',
        'src/proxy.cc',
        'src/socket.cc',
      ],

      'include_dirs': [
        "vendor",
        '<(PRODUCT_DIR)/../libzmq/include',
      ],

      'defines': [
        'NAPI_VERSION=3',
        'NAPI_DISABLE_CPP_EXCEPTIONS',
        'ZMQ_STATIC',
      ],

      'conditions': [
        ["zmq_draft == 'true'", {
          'defines': [
            'ZMQ_BUILD_DRAFT_API',
          ],
        }],

        ["zmq_no_sync_resolve == 'true'", {
          'defines': [
            'ZMQ_NO_SYNC_RESOLVE',
          ],
        }],

        ["zmq_shared == 'true'", {
          'link_settings': {
            'libraries': ['-lzmq'],
          },
        }, {
          'conditions': [
            ['OS != "win"', {
              'libraries': [
                '<(PRODUCT_DIR)/../libzmq/lib/libzmq.a',
              ],
            }],

            ['OS == "win"', {
              'msbuild_toolset': 'v141',
              'libraries': [
                '<(PRODUCT_DIR)/../libzmq/lib/libzmq',
                'ws2_32.lib',
                'iphlpapi',
              ],
            }],
          ],
        }],
      ],

      'configurations': {
        'Debug': {
          'conditions': [
            ['OS == "linux" or OS == "freebsd" or OS == "openbsd" or OS == "solaris"', {
              'cflags_cc!': [
                '-std=gnu++0x',
                '-std=gnu++1y'
              ],
              'cflags_cc+': [
                '-std=c++17',
                '-Wno-missing-field-initializers',
              ],
            }],

            ['OS == "mac"', {
              'xcode_settings': {
                # https://pewpewthespells.com/blog/buildsettings.html
                'CLANG_CXX_LIBRARY': 'libc++',
                'CLANG_CXX_LANGUAGE_STANDARD': 'c++17',
                'MACOSX_DEPLOYMENT_TARGET': '10.9',
                'WARNING_CFLAGS': [
                  '-Wextra',
                  '-Wno-unused-parameter',
                  '-Wno-missing-field-initializers',
                ],
              },
            }],

            ['OS == "win"', {
              'msvs_settings': {
                'VCCLCompilerTool': {
                  # 0 - MultiThreaded (/MT)
                  # 1 - MultiThreadedDebug (/MTd)
                  # 2 - MultiThreadedDLL (/MD)
                  # 3 - MultiThreadedDebugDLL (/MDd)
                  'RuntimeLibrary': 3,
                  'AdditionalOptions': [
                    '-std:c++17',
                  ],
                },
              },
            }],
          ],
        },

        'Release': {
          'conditions': [
            ['OS == "linux" or OS == "freebsd" or OS == "openbsd" or OS == "solaris"', {
              'cflags_cc!': [
                '-std=gnu++0x',
                '-std=gnu++1y'
              ],
              'cflags_cc+': [
                '-std=c++17',
                '-flto',
                '-Wno-missing-field-initializers',
              ],
            }],

            ['OS == "mac"', {
              # https://pewpewthespells.com/blog/buildsettings.html
              'xcode_settings': {
                'CLANG_CXX_LIBRARY': 'libc++',
                'CLANG_CXX_LANGUAGE_STANDARD': 'c++17',
                'MACOSX_DEPLOYMENT_TARGET': '10.9',
                'LLVM_LTO': 'YES',
                'GCC_OPTIMIZATION_LEVEL': '3',
                'DEPLOYMENT_POSTPROCESSING': 'YES',
                'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES',
                'DEAD_CODE_STRIPPING': 'YES',
              },
            }],

            ['OS == "win"', {
              'msvs_settings': {
                'VCCLCompilerTool': {
                  # 0 - MultiThreaded (/MT)
                  # 1 - MultiThreadedDebug (/MTd)
                  # 2 - MultiThreadedDLL (/MD)
                  # 3 - MultiThreadedDebugDLL (/MDd)
                  'RuntimeLibrary': 2,
                  'AdditionalOptions': [
                    '-std:c++17',
                  ],
                },
                'VCLinkerTool': {
                  'AdditionalOptions': ['/ignore:4099'],
                },
              },
            }],
          ],
        },
      },
    },
  ],
}
