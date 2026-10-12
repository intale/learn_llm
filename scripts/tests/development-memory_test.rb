# frozen_string_literal: true

require_relative '../development-memory'
require 'minitest/autorun'
require 'tmpdir'
require 'stringio'
require 'fileutils'

class DevelopmentMemoryTest < Minitest::Test
  # Passive content fixtures reused from the server's skill get/asset query specs.
  TEXT = 'Inspect the complete diff.'
  TEXT_SHA = 'sha256:63f667e10d0ef1551dd1135f87494d3af8ab12719965d5ef1b8b67340c3c0e36'
  BINARY = "\x00\x01skill\xff".b
  BINARY_SHA = 'sha256:a4a511124444ce36dc704af53c55ef4b80274f80cf56eb977bc0f986196ccdeb'
  Tool = Struct.new(:name, :input_schema, :output_schema, :annotations)

  class Reads
    attr_reader :calls, :closed

    def initialize(responses)
      @responses = responses
      @calls = []
    end

    def call(tool, arguments)
      @calls << [tool, arguments]
      Marshal.load(Marshal.dump(@responses.fetch(tool)))
    end

    def close
      @closed = true
    end
  end

  class ProtocolClient
    attr_reader :offered, :calls
    attr_accessor :protocol_version, :server_capabilities, :response, :tools

    def initialize
      @protocol_version = DevelopmentMemory::PROTOCOL
      @server_capabilities = {'extensions' => {DevelopmentMemory::TASKS => {}}}
      @calls = []
      @tools = [Tool.new('skill_list', {'type' => 'object'},
                         {'type' => 'object', 'required' => %w[status data],
                          'properties' => {'status' => {'type' => 'string'}, 'data' => {'type' => 'object'}}},
                         {'readOnlyHint' => true})]
      @response = {'result' => {'resultType' => 'complete', 'isError' => false,
                               'structuredContent' => {'status' => 'ok', 'data' => {'page' => {'items' => [], 'has_more' => false}}}}}
    end

    def connect(**options)
      @offered = options
    end

    def call_tool(**options)
      @calls << options
      @response
    end
  end

  def artifact_reads(content = nil, metadata = nil)
    content ||= {'artifact_id' => 'fixture.artifact', 'encoding' => 'utf-8', 'media_type' => 'text/plain',
                 'text' => TEXT, 'content_sha256' => TEXT_SHA, 'byte_size' => 26}
    metadata ||= content.reject { |key, _| %w[text base64].include?(key) }.merge('observation_id' => 'fixture.observation')
    Reads.new('development_artifact_get' => {'artifact' => {'artifact' => metadata}},
              'development_artifact_content_get' => {'content' => content})
  end

  def artifact(reads = artifact_reads, **options)
    DevelopmentMemory::Reader.new(reads).artifact(id: 'fixture.artifact', observation: 'fixture.observation', **options)
  end

  def skill_value
    {'skill_id' => 'fixture.skill', 'scope' => 'project:fixture', 'name' => 'review', 'revision' => 2,
     'instructions' => TEXT, 'description' => 'Fixture', 'content_digest' => "sha256:#{'1' * 64}",
     'assets' => [{'path' => 'fixtures/input.bin', 'media_type' => 'application/octet-stream', 'executable' => false,
                   'content_sha256' => BINARY_SHA, 'byte_size' => 8}],
     'published' => {'event' => {'event_id' => 'fixture.publication'}}}
  end

  def asset_value
    {'skill_id' => 'fixture.skill', 'scope' => 'project:fixture', 'name' => 'review', 'revision' => 2,
     'path' => 'fixtures/input.bin', 'encoding' => 'binary', 'media_type' => 'application/octet-stream',
     'base64' => 'AAFza2lsbP8=', 'executable' => false, 'content_sha256' => BINARY_SHA, 'byte_size' => 8,
     'published' => {'event' => {'event_id' => 'fixture.publication'}}}
  end

  def skill_reads(skill = skill_value, asset = asset_value)
    Reads.new('skill_get' => {'skill' => skill}, 'skill_asset_get' => {'asset' => asset})
  end

  def asset(reads = skill_reads)
    DevelopmentMemory::Reader.new(reads).asset(scope: 'project:fixture', name: 'review', revision: 2, path: 'fixtures/input.bin')
  end

  def test_protocol_negotiates_tasks_and_uses_sdk_read_call
    client = ProtocolClient.new
    sdk = DevelopmentMemory::SDK.new(url: 'http://example.test/mcp', client: client)
    sdk.call('skill_list', {'limit' => 1})
    assert_equal :modern, client.offered[:mode]
    assert_equal '2026-07-28', client.offered[:protocol_version]
    assert_equal({'extensions' => {'io.modelcontextprotocol/tasks' => {}}}, client.offered[:capabilities].transform_keys(&:to_s))
    assert_equal [{name: 'skill_list', arguments: {'limit' => 1}}], client.calls
  end

  def test_missing_tasks_support_and_protocol_drift_fail
    client = ProtocolClient.new
    client.server_capabilities = {'extensions' => {}}
    assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::SDK.new(client: client) }
    client.server_capabilities = {'extensions' => {DevelopmentMemory::TASKS => {}}}
    client.protocol_version = '2025-11-25'
    assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::SDK.new(client: client) }
  end

  def test_mutation_and_wrong_annotation_never_reach_call_tool
    client = ProtocolClient.new
    sdk = DevelopmentMemory::SDK.new(client: client)
    assert_raises(DevelopmentMemory::Error) { sdk.call('skill_publish', {}) }
    client.tools.first.annotations['readOnlyHint'] = false
    assert_raises(DevelopmentMemory::Error) { sdk.call('skill_list', {}) }
    assert_empty client.calls
  end

  def test_missing_capability_error_is_reported_without_task_mutation
    client = ProtocolClient.new
    sdk = DevelopmentMemory::SDK.new(client: client)
    client.response = {'error' => {'code' => -32003, 'message' => 'Missing required client capability'}}
    error = assert_raises(DevelopmentMemory::Error) { sdk.call('skill_list', {}) }
    assert_match(/Tasks extension/, error.message)
    assert_equal 1, client.calls.length
  end

  def test_task_or_error_result_cannot_be_treated_as_read_content
    client = ProtocolClient.new
    sdk = DevelopmentMemory::SDK.new(client: client)
    client.response['result']['resultType'] = 'task'
    assert_raises(DevelopmentMemory::Error) { sdk.call('skill_list', {}) }
    client.response['result']['resultType'] = 'complete'
    client.response['result']['isError'] = true
    assert_raises(DevelopmentMemory::Error) { sdk.call('skill_list', {}) }
  end

  def test_advertised_response_schema_is_enforced
    client = ProtocolClient.new
    sdk = DevelopmentMemory::SDK.new(client: client)
    client.response['result']['structuredContent']['status'] = 7
    assert_raises(DevelopmentMemory::Error) { sdk.call('skill_list', {}) }
  end

  def test_artifact_metadata_and_content_pin_same_observation
    reads = artifact_reads
    bytes, metadata = artifact(reads, expected_sha: TEXT_SHA)
    assert_equal TEXT.b, bytes
    assert_equal 'fixture.observation', metadata['observation_id']
    assert_equal %w[development_artifact_get development_artifact_content_get], reads.calls.map(&:first)
    assert reads.calls.all? { |_, args| args['observation_id'] == 'fixture.observation' }
  end

  def test_artifact_tuple_drift_fails_before_content_read
    reads = artifact_reads(nil, {'artifact_id' => 'fixture.artifact', 'observation_id' => 'different.observation'})
    assert_raises(DevelopmentMemory::Error) { artifact(reads) }
    assert_equal 1, reads.calls.length
  end

  def test_artifact_hash_byte_encoding_and_media_drift_fail
    original = artifact_reads
    original_content = original.call('development_artifact_content_get', {})['content']
    %w[content_sha256 byte_size encoding media_type].each do |field|
      content = original_content.merge(field => {'content_sha256' => "sha256:#{'0' * 64}", 'byte_size' => 25,
                                                'encoding' => 'binary', 'media_type' => 'text/markdown'}[field])
      metadata = original_content.reject { |key, _| key == 'text' }.merge('observation_id' => 'fixture.observation')
      assert_raises(DevelopmentMemory::Error, field) { artifact(artifact_reads(content, metadata)) }
    end
  end

  def test_consistently_tampered_metadata_cannot_rescue_bad_content
    content = {'artifact_id' => 'fixture.artifact', 'encoding' => 'utf-8', 'media_type' => 'text/plain',
               'text' => TEXT, 'content_sha256' => "sha256:#{'0' * 64}", 'byte_size' => 26}
    assert_raises(DevelopmentMemory::Error) { artifact(artifact_reads(content)) }
    content['content_sha256'] = TEXT_SHA
    content['byte_size'] = 25
    assert_raises(DevelopmentMemory::Error) { artifact(artifact_reads(content)) }
  end

  def test_utf8_newlines_are_preserved_and_invalid_utf8_is_rejected
    content = {'artifact_id' => 'fixture.artifact', 'encoding' => 'utf-8', 'media_type' => 'text/plain',
               'text' => "π\r\n", 'content_sha256' => 'sha256:53d2dbafdd10ab7844bc061eb4e6fc2b17764f08ab757e0ec9615419f719ad54', 'byte_size' => 4}
    assert_equal "π\r\n".b, artifact(artifact_reads(content)).first
    content['text'] = "\xff".b
    assert_raises(DevelopmentMemory::Error) { artifact(artifact_reads(content)) }
  end

  def test_binary_asset_preserves_zero_bytes_and_never_executes
    reads = skill_reads
    bytes, metadata = asset(reads)
    assert_equal BINARY, bytes
    assert_equal false, metadata['stored_executable']
    assert reads.calls.all? { |_, args| args['revision'] == 2 }
    assert_equal %w[skill_get skill_asset_get], reads.calls.map(&:first)
  end

  def test_binary_whitespace_and_noncanonical_padding_fail
    %w[AAFza2lsbP9=].each do |encoded|
      assert_raises(DevelopmentMemory::Error) { asset(skill_reads(skill_value, asset_value.merge('base64' => encoded))) }
    end
    assert_raises(DevelopmentMemory::Error) { asset(skill_reads(skill_value, asset_value.merge('base64' => "AAFza2lsbP8=\n"))) }
  end

  def test_mixed_binary_text_payload_is_rejected
    assert_raises(DevelopmentMemory::Error) { asset(skill_reads(skill_value, asset_value.merge('text' => 'unexpected'))) }
  end

  def test_skill_tuple_path_manifest_and_publication_drift_fail
    {'scope' => 'project:other', 'name' => 'other', 'revision' => 3,
     'path' => 'fixtures/other.bin', 'skill_id' => 'different.skill',
     'media_type' => 'text/plain', 'byte_size' => 7,
     'content_sha256' => "sha256:#{'0' * 64}",
     'published' => {'event' => {'event_id' => 'other.publication'}}}.each do |field, value|
      assert_raises(DevelopmentMemory::Error, field) { asset(skill_reads(skill_value, asset_value.merge(field => value))) }
    end
  end

  def test_skill_instruction_sha_is_distinct_from_snapshot_digest
    bytes, metadata = DevelopmentMemory::Reader.new(skill_reads).instructions(scope: 'project:fixture', name: 'review', revision: 2, expected_sha: TEXT_SHA)
    assert_equal TEXT.b, bytes
    assert_equal TEXT_SHA, metadata['content_sha256']
    refute_equal TEXT_SHA, metadata['snapshot_content_digest']
    assert_raises(DevelopmentMemory::Error) do
      DevelopmentMemory::Reader.new(skill_reads).instructions(scope: 'project:fixture', name: 'review', revision: 2, expected_sha: "sha256:#{'0' * 64}")
    end
  end

  def test_unexpected_typed_data_kind_is_rejected
    reads = Reads.new('development_artifact_get' => {})
    assert_raises(DevelopmentMemory::Error) { artifact(reads) }
    reads = Reads.new('skill_list' => {'content' => {}})
    assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Reader.new(reads).query('skill_list', {}) }
  end

  def test_output_is_exact_private_and_never_overwritten
    Dir.mktmpdir do |directory|
      path = File.join(directory, 'exact.bin')
      DevelopmentMemory::Files.write(path, BINARY)
      assert_equal BINARY, File.binread(path)
      assert_equal 0o600, File.stat(path).mode & 0o777
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.write(path, 'replacement') }
      assert_equal BINARY, File.binread(path)
      assert_equal ['exact.bin'], Dir.children(directory)
    end
  end

  def test_leaf_ancestor_symlinks_and_nonregular_targets_are_refused
    Dir.mktmpdir do |directory|
      File.symlink('missing', File.join(directory, 'leaf'))
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.write(File.join(directory, 'leaf'), BINARY) }
      Dir.mkdir(File.join(directory, 'real'))
      File.symlink('real', File.join(directory, 'alias'))
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.write(File.join(directory, 'alias', 'output'), BINARY) }
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.write(File.join(directory, 'real'), BINARY) }
      assert_empty Dir.children(File.join(directory, 'real'))
    end
  end

  def test_query_requires_regular_bounded_utf8_json_object
    Dir.mktmpdir do |directory|
      path = File.join(directory, 'query.json')
      File.binwrite(path, '{"scope":"project:fixture"}')
      assert_equal({'scope' => 'project:fixture'}, DevelopmentMemory::Files.query(path))
      File.symlink('query.json', File.join(directory, 'alias'))
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.query(File.join(directory, 'alias')) }
      File.binwrite(path, 'x' * (64 * 1024 + 1))
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.query(path) }
      File.binwrite(path, '[]')
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.query(path) }
      File.binwrite(path, "\xff".b)
      assert_raises(DevelopmentMemory::Error) { DevelopmentMemory::Files.query(path) }
    end
  end

  def test_cli_requires_pins_and_rejects_mixed_or_duplicate_outputs_before_connecting
    commands = [
      %w[artifact get --id fixture.artifact --out /tmp/never-write],
      %w[skill get --scope project:fixture --name review --out /tmp/never-write],
      %w[skill asset --scope project:fixture --name review --path input --out /tmp/never-write],
      %w[artifact get --id x --observation y --out /tmp/never-write --query ignored],
      %w[artifact get --id x --observation y --out /tmp/one --out /tmp/two]
    ]
    commands.each do |command|
      connected = false
      result = DevelopmentMemory::CLI.run(command, stdout: StringIO.new, stderr: StringIO.new,
                                          sdk_factory: ->(_) { connected = true })
      assert_equal 1, result
      refute connected
    end
  end

  def test_cli_outputs_only_metadata_and_one_exact_file
    Dir.mktmpdir do |directory|
      path = File.join(directory, 'artifact.txt')
      reads = artifact_reads
      output = StringIO.new
      result = DevelopmentMemory::CLI.run(['artifact', 'get', '--id', 'fixture.artifact', '--observation', 'fixture.observation', '--out', path, '--sha256', TEXT_SHA],
                                          stdout: output, stderr: StringIO.new, sdk_factory: ->(_) { reads })
      assert_equal 0, result
      assert_equal TEXT.b, File.binread(path)
      refute_includes output.string, TEXT
      refute JSON.parse(output.string).key?('text')
      assert_equal ['artifact.txt'], Dir.children(directory)
      assert reads.closed
    end
  end

  def test_query_keeps_literal_dsl_and_explicit_cursor
    expression = {'fields' => [{'field' => 'development_artifact.content', 'query' => {'match' => 'contains', 'value' => 'raw%_\\literal'}}],
                  'filters' => {'scope' => 'project:fixture'}, 'cursor' => 'opaque.cursor'}
    reads = Reads.new('development_search' => {'page' => {'items' => [], 'has_more' => false, 'cursor' => nil}})
    DevelopmentMemory::Reader.new(reads).query('development_search', expression)
    assert_equal expression.merge('limit' => 20), reads.calls.first.last
    refute expression.key?('limit')
  end
end
