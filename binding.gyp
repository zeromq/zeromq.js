{
  'variables': {
    'zmq_shared%': 'false',
    'zmq_draft%': 'false',
    'zmq_no_sync_resolve%': 'false',
    'sanitizers%': 'false',
    'openssl_fips': '',
    'runtime%': 'node',
  },

  'targets': [
    {
      'target_name': 'libzmq',
      'type': 'none',

      'conditions': [
        ["zmq_shared == 'false'", {
          'actions': [{
            'action_name': 'build_libzmq',
            'inputs': [],
            'conditions': [
              ['OS != "win"', {
                'outputs': ['<(module_root_dir)/build/libzmq/lib/libzmq.a', '<(module_root_dir)/build/libzmq/include/zmq.h', '<(module_root_dir)/build/libzmq/include/zmq_utils.h'],
              }],
              ['OS == "win"', {
                'outputs': ['<(module_root_dir)/build/libzmq/lib/libzmq.lib', '<(module_root_dir)/build/libzmq/include/zmq.h', '<(module_root_dir)/build/libzmq/include/zmq_utils.h'],
              }],
            ],
            'action': ['node', '<(module_root_dir)/script/build.js'],
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
        '<(module_root_dir)/build/libzmq/include',
        "<!@(node -p \"require('node-addon-api').include\")"
      ],

      'defines': [
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
                '<(module_root_dir)/build/libzmq/lib/libzmq.a',
              ],
            }],

            ['OS == "mac"', {
              'libraries': [
                '<(module_root_dir)/build/libzmq/lib/libzmq.a',
                "<!@(pkg-config libsodium --libs)",
              ],
            }],

            ['OS == "win"', {
              'libraries': [
                '<(module_root_dir)/build/libzmq/lib/libzmq',
                'ws2_32.lib',
                'iphlpapi',
              ],
            }],
          ],
        }],
        ['runtime=="electron"', {
          "defines": ["NODE_RUNTIME_ELECTRON=1"]
        }],
      ],

      'configurations': {
        'Debug': {
          'defines': ['NAPI_CPP_EXCEPTIONS', 'DEBUG', '_DEBUG'],
          'cflags_cc!': [
            "-fno-exceptions",
          ],
          "cflags_cc": [
            "-fexceptions"
          ],
          'conditions': [
            ['OS == "linux" or OS == "freebsd" or OS == "openbsd" or OS == "solaris"', {
              # flag removal
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
                'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                'GCC_ENABLE_EXCEPTIONS': 'YES',
                'OTHER_CFLAGS': [
                  "<!(echo \"-arch ${ARCH:=x86_64}\")",
                ],
                'OTHER_LDFLAGS': [
                  "<!(echo \"-arch ${ARCH:=x86_64}\")",
                ]
              },
            }],

            ['OS == "win"', {
              'msvs_settings': {
                'conditions': [
                  ['"<@(sanitizers)" != "true"', {
                    # without sanitizer
                    'VCCLCompilerTool': {
                      'ExceptionHandling': 2,       # /EHsc
                      # 0 - MultiThreaded (/MT)
                      # 1 - MultiThreadedDebug (/MTd)
                      # 2 - MultiThreadedDLL (/MD)
                      # 3 - MultiThreadedDebugDLL (/MDd)
                      'RuntimeLibrary': 3,
                      'AdditionalOptions': [
                        '-std:c++17',
                        "/DEBUG",
                      ],
                    },
                    'VCLinkerTool': {
                      'BasicRuntimeChecks': 3,        # /RTC1
                    },
                  }, {
                    # with sanitizer
                    # Build with `node-gyp rebuild --debug --sanitizers='true'`
                    # Make sure to add the followings (or what your MSVC use) to the PATH and run `refreshenv`.
                    # # C:/Program Files (x86)/Microsoft Visual Studio/2019/Preview/VC/Tools/MSVC/14.29.29917/lib/x64/
                    # # C:/Program Files (x86)/Microsoft Visual Studio/2019/Preview/VC/Tools/MSVC/14.29.29917/bin/Hostx64/x64/
                    'VCCLCompilerTool': {
                      'ExceptionHandling': 2,       # /EHsc
                      'RuntimeLibrary': 3,
                      "DebugInformationFormat": "ProgramDatabase", # /Zi
                      'AdditionalOptions': [
                        '-std:c++17',
                        "/DEBUG",
                        "/fsanitize=address",
                      ],
                    },
                    'VCLinkerTool': {
                      'BasicRuntimeChecks': 0, # not supported with fsanitize
                      "LinkIncremental": "NO", # /INCREMENTAL:NO
                    },
                  }],
                ],
              },
            }],
          ],
        },

        'Release': {
          'defines': [
            'NAPI_CPP_EXCEPTIONS',
          ],
          # flag removal
          'cflags_cc!': [
            "-fno-exceptions",
          ],
          "cflags_cc": [
            "-fexceptions",
          ],
          'conditions': [
            ['OS == "linux" or OS == "freebsd" or OS == "openbsd" or OS == "solaris"', {
              'cflags_cc!': [
                '-std=gnu++0x',
                '-std=gnu++1y'
              ],
              'cflags_cc+': [
                '-std=c++17',
                # '-flto',
                '-Wno-missing-field-initializers',
              ],
            }],

            ['OS == "mac"', {
              # https://pewpewthespells.com/blog/buildsettings.html
              'xcode_settings': {
                'CLANG_CXX_LIBRARY': 'libc++',
                'CLANG_CXX_LANGUAGE_STANDARD': 'c++17',
                'MACOSX_DEPLOYMENT_TARGET': '10.15',
                # 'LLVM_LTO': 'YES',
                'GCC_OPTIMIZATION_LEVEL': '3',
                'DEPLOYMENT_POSTPROCESSING': 'YES',
                'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES',
                'DEAD_CODE_STRIPPING': 'YES',
                'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                'GCC_ENABLE_EXCEPTIONS': 'YES',
                'OTHER_CFLAGS': [
                  "<!(echo \"-arch ${ARCH:=x86_64}\")",
                ],
                'OTHER_LDFLAGS': [
                  "<!(echo \"-arch ${ARCH:=x86_64}\")",
                ]
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
                    '/EHsc'
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
